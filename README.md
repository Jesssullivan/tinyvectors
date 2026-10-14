# `@tummycrypt/tinyvectors`

Animated vector blob backgrounds with lil physics for Svelte 5.

This package is what powers the moving background layer on `transscendsurvival.org`, but it is meant to be useful outside that site too. It ships a small set of Svelte components plus the lower-level motion, theme, and core utilities that drive them.

## Install

This package is distributed through Bazel only (RU6/RU8): signed git tags plus
the `tummycrypt_tinyvectors` module in
[xoxd-ai/bazel-registry](https://github.com/xoxd-ai/bazel-registry). The npm
channel stopped at 0.3.0 and nothing newer is published there.

```starlark
# MODULE.bazel
bazel_dep(name = "tummycrypt_tinyvectors", version = "1.0.0")
```

```starlark
# BUILD.bazel: link the Bazel-built package into node_modules
npm_link_package(
    name = "node_modules/@tummycrypt/tinyvectors",
    src = "@tummycrypt_tinyvectors//:pkg",
)
```

Peer dependency:

- `svelte@5.57.2` (exact)

## Quick Start

```svelte
<script lang="ts">
	import { TinyVectors } from '@tummycrypt/tinyvectors';

	const colors = [
		'rgba(26,188,156,0.35)',
		'rgba(22,160,133,0.30)',
		'rgba(39,174,96,0.25)',
		'rgba(52,152,219,0.20)',
	];
</script>

<div class="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
	<TinyVectors
		theme="custom"
		colors={colors}
		blobCount={5}
		opacity={0.4}
		enableScrollPhysics={true}
		enableDeviceMotion={false}
	/>
</div>
```

Device motion must be requested from a user gesture on browsers that gate sensor APIs:

```svelte
<script lang="ts">
	import { TinyVectors } from '@tummycrypt/tinyvectors';

	interface TinyVectorsHandle {
		requestDeviceMotionPermission: () => Promise<boolean>;
		calibrateDeviceMotion: (samples?: number) => void;
	}

	let vectors: TinyVectorsHandle | undefined;
</script>

<TinyVectors bind:this={vectors} enableDeviceMotion={true} />
<button type="button" onclick={() => vectors?.requestDeviceMotionPermission()}>
	Enable motion
</button>
<button type="button" onclick={() => vectors?.calibrateDeviceMotion(10)}>
	Calibrate
</button>
```

TinyVectors auto-starts device-orientation motion on secure browsers that do not require a
permission prompt. On permission-gated browsers, keep `enableDeviceMotion={true}` and call
`requestDeviceMotionPermission()` from a user gesture. If sensor events pause or the document is
hidden, TinyVectors resets device motion to neutral so stale tilt cannot keep steering the blobs.
Tune that watchdog with `deviceMotionIdleResetMs` when a host app needs faster or slower sensor
liveness handling. Pointer physics is enabled by default only when pointer, touch, or mouse input is
detected, and resets to center when pointer input is canceled, the pointer leaves the viewport, or
the window blurs.
Use `getDeviceMotionStatus()` on the component handle to inspect support, permission, and listener
state before deciding whether to show motion-permission UI.

## Entry Points

The package exports these public entry points:

- `@tummycrypt/tinyvectors`
- `@tummycrypt/tinyvectors/core`
- `@tummycrypt/tinyvectors/motion`
- `@tummycrypt/tinyvectors/themes`
- `@tummycrypt/tinyvectors/themes/css`
- `@tummycrypt/tinyvectors/svelte`

Use the top-level entry point when you just want the packaged component surface. Reach for the lower-level paths if you are composing your own vector layer, motion handling, or theme primitives.

## Local Development

```bash
pnpm install   # pnpm 10.13.1 via packageManager / corepack
pnpm check     # svelte-check --tsgo (TypeScript 7.0.2)
pnpm test
pnpm build
```

Useful extra commands:

- `pnpm dev` runs the local Vite demo app
- `pnpm dev:watch` rebuilds the library on change
- `pnpm test:pbt` runs the property-based invariants only
- `pnpm test:browser:motion` launches a headless Chrome/CDP probe for synthetic orientation, CDP orientation, pointer delivery, directional motion signs, reduced-motion listener lifecycle, and CDP accelerometer input
- `pnpm check:release-metadata` verifies `package.json`, `BUILD.bazel`, and `MODULE.bazel` stay aligned
- `pnpm check:package` runs `publint`
- `pnpm check:bundle-size` measures the tree-shaken `{ TinyVectors }` consumer bundle with Svelte externalized
- `pnpm check:package-consumer` validates the Bazel-built package from `./bazel-bin/pkg` in a temporary consumer workspace

The Bazel release flow is documented in [docs/release-flow.md](./docs/release-flow.md).
The physics interaction direction is documented in [docs/physics-feel-contract.md](./docs/physics-feel-contract.md).

The dev app includes a browser/device harness for interaction work:

- Use the panel toggles to isolate pointer, scroll, and device-motion physics.
- Use `Spoof Tilt` and `Neutral Tilt` to verify TinyVectors motion wiring without relying on browser sensor tooling.
- On a phone or tablet, open the dev URL, tap `Request Motion`, keep the device still, tap `Calibrate`, then tilt the device.
- In desktop Chrome DevTools, use the Sensors panel to emulate orientation changes and watch the motion `x/y/z` status line. The browser probe also exercises Chrome's CDP pointer, reduced-motion media emulation, and accelerometer override paths.

## Release Truth

The supported consumer path is the xoxd-ai/bazel-registry graph (see
Install); the npm channel is retired at 0.3.0 and the package is private.

This repo carries Bazel metadata as a first-class release surface: `//:pkg`
is the publishable package, and the bazel-registry entry (byte-identical
`MODULE.bazel` snapshot + sha256-pinned `source.json`) is part of every
release. `docs/release-flow.md` documents the full ritual; the release
metadata gate keeps package.json, MODULE.bazel, and BUILD.bazel aligned.

## License

This repository is distributed under the zlib/libpng license. See [LICENSE](./LICENSE).
