use std::{
    fs::canonicalize,
    path::PathBuf,
    process::Command,
    sync::mpsc::{channel, Receiver},
    time::Duration,
};
extern crate notify;
use notify::{watcher, DebouncedEvent, RecursiveMode, Watcher};

pub struct BuildOptions {
    /// The path to the package to build. In `nix build .#foo`, `.` is the path.
    ///
    /// Any changes to files in this path will trigger a rebuild.
    pub path: Option<String>,
    /// The name of the package to build. In `nix build .#foo`, `foo` is the package name.
    pub package_name: Option<String>,
    /// Additional options passed to nix build
    pub build_options: Vec<String>,
    /// Skip the first build before watching
    pub skip_initial_build: bool,
}

pub struct ResolvedBuildOptions {
    /// The path to the package to build. In `nix build .#foo`, `.` is the path.
    ///
    /// Any changes to files in this path will trigger a rebuild.
    pub path: PathBuf,
    /// The name of the package to build. In `nix build .#foo`, `foo` is the package name.
    pub package_name: Option<String>,
    /// Additional options passed to nix build
    pub build_options: Vec<String>,
    /// Skip the first build before watching
    pub skip_initial_build: bool,
    /// The full path to the flake. In `nix build .#foo`, the target package would look like `/absolute/path/to/.#foo`.
    pub target_package: String,
}

pub fn resolve_build_options(options: BuildOptions) -> ResolvedBuildOptions {
    let relative_path = PathBuf::from(options.path.unwrap_or(String::from(".")));
    let path = canonicalize(relative_path).expect("Failed to canonicalize path");
    let package_name = options.package_name;
    let mut target_package: String = path.clone().into_os_string().into_string().unwrap();

    if package_name.is_some() {
        target_package = format!("{}#{}", target_package, package_name.clone().unwrap());
    }
    let build_options = options.build_options;
    let skip_initial_build = options.skip_initial_build;

    return ResolvedBuildOptions {
        path,
        package_name,
        target_package,
        build_options,
        skip_initial_build,
    };
}

pub fn build(options: &ResolvedBuildOptions) -> Result<String, String> {
    let target_package = &options.target_package;
    let build_options = &options.build_options;

    let output = Command::new("nix")
        .args(&["build", "--no-link", "--print-out-paths", &target_package])
        .args(build_options)
        .output();

    if output.is_err() {
        return Err(String::from("Failed to run nix build"));
    }
    let stdout = output.unwrap().stdout;
    let stdout_string = String::from_utf8(stdout).unwrap();
    let created_path = stdout_string.trim().split(" ").next().unwrap_or("");
    if created_path.is_empty() {
        return Err(String::from("Failed to get output path"));
    }
    return Ok(String::from(created_path));
}

pub struct FlakeWatcher {
    pub watcher: notify::RecommendedWatcher,
    pub rx: Receiver<notify::DebouncedEvent>,
    pub last_output_path: Option<String>,
}

impl FlakeWatcher {
    pub fn new(options: &ResolvedBuildOptions) -> FlakeWatcher {
        let mut initial_build_result: Option<String> = None;
        if !options.skip_initial_build {
            initial_build_result = build(options).ok();
            match &initial_build_result {
                Some(value) => println!("{}", value),
                _ => {}
            }
        }

        let (tx, rx) = channel();

        // Create a watcher object, delivering debounced events.
        // The notification back-end is selected based on the platform.
        let mut watcher = watcher(tx, Duration::from_millis(200)).unwrap();

        // Add a path to be watched. All files and directories at that path and
        // below will be monitored for changes.
        watcher
            .watch(options.path.clone(), RecursiveMode::Recursive)
            .unwrap();

        FlakeWatcher {
            watcher,
            rx,
            last_output_path: initial_build_result,
        }
    }

    pub fn next_event(&self) -> Result<notify::DebouncedEvent, String> {
        match self.rx.recv() {
            Ok(event) => Ok(event),
            Err(e) => Err(e.to_string()),
        }
    }
}

pub fn watch_flake(options: &ResolvedBuildOptions) -> () {
    let mut watcher = FlakeWatcher::new(options);
    loop {
        let event = watcher.next_event();
        let Ok(event) = event else {
          eprintln!("Error: {}", event.err().unwrap());
          continue;
        };
        match event {
            DebouncedEvent::Write(_) => {
                let result = build(options);
                let Ok(new_output_path) = result else {
                    eprintln!("Error: {}", result.err().unwrap());
                    continue;
                };
                if watcher
                    .last_output_path
                    .clone()
                    .map(|old| old.eq(&new_output_path))
                    .unwrap_or(false)
                {
                    continue;
                }

                println!("{}", new_output_path);
                watcher.last_output_path = Some(new_output_path);
            }
            _ => {}
        }
    }
}
