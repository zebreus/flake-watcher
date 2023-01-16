use std::{fs::canonicalize, path::PathBuf, process::Command};

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

pub fn resolveBuildOptions(options: BuildOptions) -> ResolvedBuildOptions {
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

pub fn build(options: ResolvedBuildOptions) -> Result<String, String> {
    let target_package = options.target_package;
    let build_options = options.build_options;

    let output = Command::new("nix")
        .args(&["build", "--no-link", "--print-out-paths", &target_package])
        .args(&build_options)
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
