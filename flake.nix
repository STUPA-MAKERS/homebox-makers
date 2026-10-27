{
  inputs = {
    # The channel tarball instead of `github:nixos/nixpkgs`: it only moves once Hydra has
    # built the packages (so `nix develop` comes from the binary cache), and the lock pins
    # an immutable release URL.
    nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.xz";
  };

  outputs =
    { nixpkgs, ... }:
    let
      # nixpkgs 26.11 dropped x86_64-darwin.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          # Keep in step with the `go` line of backend/go.mod.
          go = pkgs.go_1_27;
        in
        {
          default = pkgs.mkShell {
            buildInputs =
              with pkgs;
              [
                # generic
                go-task

                # frontend (npm comes with nodejs)
                nodejs_24
                typescript
                typescript-language-server

                # backend
                go
                gofumpt
                golangci-lint
                sqlite
                go-swag
                gcc
                libwebp
                libavif
                libheif
                libjxl
              ]
              ++ lib.optionals stdenv.hostPlatform.isLinux [ glibc.static ];
            GO = "${go}/bin/go";
            GOROOT = "${go}/share/go";
          }
          // pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
            CFLAGS = "-I${pkgs.glibc.dev}/include";
            LDFLAGS = "-L${pkgs.glibc}/lib";
          };
        }
      );
    };
}
