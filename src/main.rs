use clap::Parser;

use crate::flakes::{resolve_build_options, watch_flake, BuildOptions};

mod flakes;

/// Watch a nix flake directory for changes, and rebuild the flake when a change is detected. Prints the new output path if it changed."
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Usually the flake is build once after starting flake-watcher even if no changes were made. This option skips that initial build.
    #[arg(long, default_value_t = false)]
    skip_initial_build: bool,

    /// The flake output that will get watched. Example: .#foo
    installable: Option<String>,

    /// Additional options passed to nix build
    #[arg(last = true)]
    nix_build_options: Vec<String>,
}

fn main() {
    let args = Args::parse();

    let path = args
        .installable
        .clone()
        .and_then(|s| s.split('#').next().map(|s| s.to_string()));
    let package_name = args
        .installable
        .clone()
        .and_then(|s| s.split('#').skip(1).next().map(|s| s.to_string()));

    let build_options = BuildOptions {
        path: path,
        package_name: package_name,
        build_options: args.nix_build_options,
        skip_initial_build: args.skip_initial_build,
    };

    let resolved_build_options = resolve_build_options(build_options);

    watch_flake(&resolved_build_options);
}
