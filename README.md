# flake-watcher

Build a local flake everytime its files change.

flake-watcher will print every new output path to stdout. Errors will be logged to stderr.

## Installation

To run without installing you can use

```shell
nix run github:zebreus/flake-watcher
```

You can install the flake with `nix profile install github:zebreus/flake-watcher` . flake-watcher is also available on [crates.io](https://crates.io/crates/flake-watcher).

## Examples

Run on the default installable of the flake in the current directory. This will build the default installable every time a file in the flake changes.

```shell
$ flake-watcher .#default
/nix/store/wgjr46wxma9cl9wa5csxn22p9vk81rw7-flake-watcher-0.1.0
/nix/store/liin7xdrpd6zj246yz2nrzm9qhgr0ycx-flake-watcher-0.1.0
/nix/store/4cixv5qz39v20a4mazzbm2g4bb64y9l8-flake-watcher-0.1.0
```

See all options:

```shell
$ flake-watcher --help
Usage: flake-watcher [OPTIONS] [INSTALLABLE] [-- <NIX_BUILD_OPTIONS>...]

Arguments:
  [INSTALLABLE]           The flake output that will get watched. Example: .#foo
  [NIX_BUILD_OPTIONS]...  Additional options passed to nix build

Options:
      --skip-initial-build  Usually the flake is build once after starting flake-watcher even if no changes were made. This option skips that initial build
  -h, --help                Print help
  -V, --version             Print version
```

## Motivation

I wanted to build a document with a nix flake and have it update every time I modify the sources. I also wanted to be able to use the same flake to build the document in CI. Originally I planned to integrate a reloading webserver in flake-watcher but I decided to keep it simple and just print the new output path to stdout. This way you can pipe the output to any other program you want. Also I wasted enough time doing this, maybe I'll add a webserver later.

```bash
# The flake output contains html files that get hosted with a reloading webserver
export TEMP_DIR=$(mktemp -d)
nix run nixpkgs#python39Packages.livereload $TEMP_DIR &
flake-watcher | xargs  -I {} cp -Trf {} $TEMP_DIR
```
