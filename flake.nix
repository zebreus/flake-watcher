{
  description = "Watch nix flakes in rust";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-22.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      rec {
        name = "flake-watcher";
        packages.flake-watcher = import ./default.nix { pkgs = nixpkgs.legacyPackages.${system}; };
        packages.default = packages.flake-watcher;
      }
    );
}
