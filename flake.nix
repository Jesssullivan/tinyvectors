{
  description = "@tummycrypt/tinyvectors — animated vector blob backgrounds";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        bazel = pkgs.writeShellScriptBin "bazel" ''
          exec ${pkgs.bazelisk}/bin/bazelisk "$@"
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            bazel
            pkgs.bazelisk
            pkgs.nodejs_22
            (pkgs.pnpm_10 or pkgs.pnpm)
          ];
          shellHook = ''
            echo "tinyvectors dev shell"
            echo "  node $(node --version)"
            echo "  pnpm $(pnpm --version)"
            echo "  bazel $(cat .bazelversion) via bazelisk"
          '';
        };
        formatter = pkgs.nixfmt;
      }
    );
}
