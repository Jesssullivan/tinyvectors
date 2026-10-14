# Changelog

> **Distribution (RU6/RU8, 2026-10-08):** this package is distributed only
> through Bazel: signed git tags plus entries in
> [xoxd-ai/bazel-registry](https://github.com/xoxd-ai/bazel-registry). The npm
> channel stopped at 0.3.0 (retired 2026-07-25) and the package is now
> `private`; nothing is published to npmjs or GitHub Packages.

## 1.0.0 - 2026-10-14

Stack uplift to the estate RU1 stack. The runtime API is unchanged: every
export, prop, default and physics constant is the same as 0.3.7. It is a major
version because the Svelte peer, the toolchain and the distribution contract
change (RU10).

### Breaking changes

- **Svelte peer is exact `5.57.2`** (was `>=5.20.0`), per the estate pin policy
  (RS11/RU5). Consumers must be on Svelte 5.57.2.
- **Bazel-only distribution.** `package.json` is `private: true`;
  `publishConfig`, the `prepublishOnly` hook and `.github/workflows/publish.yml`
  are removed (RU8). Consume `tummycrypt_tinyvectors` 1.0.0 from
  xoxd-ai/bazel-registry.
- **Build toolchain:** TypeScript 7.0.2 (native compiler), Vite 8.3.3
  (Rolldown, Oxc minifier), @sveltejs/vite-plugin-svelte 7.3.1, vitest 5.0.3,
  svelte-check 4.7.6, pnpm 10.13.1, Node toolchain 22.22.0 (engines
  `>=22.12.0`). A consumer that builds this module from source (Bazel
  `@tummycrypt_tinyvectors//:pkg`, or a tag-archive `prepare` hook) needs
  pnpm 10 and Node >= 22.12.
- `@sveltejs/package` is dropped from devDependencies (it was not used by any
  build step; declarations come from `tsc` plus the hand-written
  `*.svelte.d.ts` files).

### Migration

1. Bazel consumers: `bazel_dep(name = "tummycrypt_tinyvectors", version = "1.0.0")`
   and refresh `MODULE.bazel.lock`. Keep linking `@tummycrypt_tinyvectors//:pkg`
   with `npm_link_package`; target names are unchanged.
2. Pin `svelte` to exactly `5.57.2` in the consuming app.
3. Remove any `@tummycrypt/tinyvectors` npm or tag-tarball specifier from
   `package.json`; the registry module is the only supported source.
4. No source changes are needed: imports, component props, the
   `themes/css` entry and all exported names are identical to 0.3.7.

### Tooling details

- TypeScript 7 (RU13): `tsc` is resolved through `typescript/package.json`
  `bin` because the TypeScript 7 exports map no longer exposes
  `lib/tsc.js`. `tsconfig.json` drops `baseUrl`/`paths` (removed in
  TypeScript 7; no source used `$lib`).
- Type checking is `svelte-check --tsgo` (TypeScript 7 does the checking). The
  RU13 patch set is copied verbatim from xoxd-ai/site.scaffold (`patches/`,
  `.pnpmfile.cjs`); only `patches/svelte-check@4.7.6.patch` is wired here,
  since this package uses neither SvelteKit nor devalue. svelte-check's
  in-process svelte2tsx parser loads `@typescript/typescript6` through the
  `.pnpmfile.cjs` hook (operator ruling RU13b); nothing type-checks with it.
- Bazel: `//:typecheck` runs svelte-check `--tsgo` in a writable scratch copy
  (`scripts/bazel/run-svelte-check.mjs`), and the new `//:typecheck_canary_test`
  proves the gate reports a seeded `.ts` and `.svelte` error
  (sveltejs/language-tools#3136).
- Vite 8: `build.rolldownOptions` replaces the deprecated `rollupOptions`
  alias, and the default Oxc minifier replaces esbuild in both the library
  build and the bundle-size gate.
- fast-check 4, publint 0.3.
- `scripts/check-release-metadata.mjs` now asserts the RU8 contract
  (`private`, no `publishConfig`, no `prepublishOnly`, no `publish.yml`)
  instead of the old publish-workflow parity checks.
- Repository URLs point at xoxd-ai.

## 0.3.7 - 2026-09-01

- Idle drift cruise: `driftAngle`/`driftSpeed` — initialized per blob since 0.3.0 but never read by the physics loop — are now wired into the screensaver physics step as a constant per-substep force along each blob's persistent heading, with `driftSpeed` its terminal speed under the unchanged `*= 0.992` damping. With no pointer, scroll, or devicemotion input (i.e. every idle desktop), the only idle motion was zero-mean jitter and a slow bounded slosh, so the background read as frozen; blobs now drift gently around the field by default, reach the walls, and bounce (`recordBounce()` already re-randomizes the heading on impact). No permission grant or sensor is required, and devicemotion/pointer/scroll input still layers on top with identical feel: the cruise force is purely additive and consumes no randomness, so transient impulses decay exactly as before.
- `driftSpeed` init raised from `0.01 + rand * 0.015` (dead-code-era values, weaker than the ambient slosh) to `0.05 + rand * 0.05`: terminal cruise ≈ 3–6 units/s in the 180-unit physics field, i.e. a blob crosses the field in roughly 30–60 s.
- `prefers-reduced-motion` behavior is unchanged: the cruise lives inside the physics step, which `TinyVectors` never runs while reduced motion is active (`respectReducedMotion` defaults `true` and renders the existing static frame).
- The per-substep damping literal is extracted to a named `VELOCITY_DAMPING` constant (still `0.992`); no behavior change.

## 0.3.6 - 2026-07-25

- Adds a `respectReducedMotion?: boolean` prop (default `true`) to `TinyVectors`: when `(prefers-reduced-motion: reduce)` matches, the component renders the existing static single frame (the same path `animated={false}` already uses) instead of running the rAF loop, and switches live if the media query changes. Pass `respectReducedMotion={false}` to animate regardless (TIN-3170).
- Pauses the rAF loop when the document is hidden (`visibilitychange`) or the container scrolls out of the viewport (`IntersectionObserver`, threshold `0`, `rootMargin: '10%'`), and resumes cleanly — `startAnimation()` already resets its frame-delta clock on resume, so there is no jump. Fully SSR-guarded; no visual change while the component is actually visible (TIN-3168).
- Fixed-timestep physics: `BlobPhysics.tick()` keeps its public `(deltaTime, time)` signature, but now accumulates the caller's variable per-frame `deltaTime` and steps the simulation in fixed `1/60`s quanta (capped at 8 substeps per call), instead of integrating directly on the raw frame delta. Feel and damping previously scaled with the caller's refresh rate (~2x faster/more-damped at 120Hz, half speed at 30Hz); coefficients are unchanged, only the stepping cadence is new. Concretely: pre-0.3.6, a 120Hz display ran physics roughly 2x too fast, so the 0.3.6 feel change on non-60Hz displays is the **correction** toward refresh-rate independence documented in `docs/physics-feel-contract.md`, not a regression — 60Hz displays, the common baseline, see no feel change (TIN-853).
- `BlobPhysics.tick()`'s `time` argument is now ignored; phase math runs on an internal fixed-step clock.
- `tick()` now guards against a non-finite `deltaTime` (e.g. `NaN` from a corrupt rAF timestamp): it is coerced to `0` instead of poisoning the fixed-timestep accumulator, which previously would have propagated `NaN` forever and frozen physics on every subsequent call.
- The internal simulation clock now seeds to a random `[0, 45)` offset at construction instead of starting at exactly `0`, restoring 0.3.5's stochastic mount phase so the ~45s territory reshuffle doesn't fire at the same deterministic offset on every mount. Seeded-RNG unit tests re-seed `Math.random()` immediately before constructing `BlobPhysics`, so coverage stays fully deterministic.
- `scripts/check-release-metadata.mjs` now requires a `## <version>` heading to exist anywhere in `CHANGELOG.md` (tolerating a `## Unreleased` heading on top) instead of requiring the *first* `## ` heading to equal the version; a changelog with no `## ` heading at all now fails with the same tidy mismatch message as every other check instead of throwing an uncaught exception (TIN-3171).
- Bundle size: `dist/index.js`'s gzip size grows from 11.19 KiB (0.3.5) to 11.73 KiB in this release — 0.27 KiB of headroom remains under the 12 KiB gate. `DeviceMotion`'s lazy-load is the named next reclaim lever if headroom needs recovering.
- **Known issue:** the static frame does not repaint when `theme`/`colors` change while the component is not animating (e.g. `animated={false}`, reduced motion, hidden/off-screen tab) — the frozen frame keeps whatever colors were current the last time it rendered. Pre-existing, not introduced by this release; left unfixed here.

## 0.3.5 - 2026-07-25

- Fixes hermetic Bazel/RBE builds (TIN-2099): `npm_translate_lock` now sets `lifecycle_hooks = {"esbuild": []}` so rules_js no longer runs esbuild's `node install.js` postinstall as a build action, which failed under strict sandbox/worker strategies (network blocked, platform package absent from inputs). Safe because vite drives esbuild through its JS API, whose bin-path resolution falls back to `require.resolve('@esbuild/<platform>/bin/esbuild')` at runtime, and `pnpm-lock.yaml` pins every `@esbuild/*` platform package.
- Multi-signal dark detection: `isDarkMode()`/`watchDarkMode()` and `BlobSVG`'s blend switch now recognize a `.dark` root class, Skeleton v4's `data-mode="dark"` attribute, or a `color-scheme: dark` computed on the root element; `watchDarkMode()` observes both `class` and `data-mode` mutations and `prefers-color-scheme` changes. Previously the dark blend never engaged on Skeleton v4 consumers, which signal dark via `data-mode="dark"`, not a `.dark` class. Existing `.dark`-class consumers are unchanged.
- Adds an `isDark?: boolean | null` prop (default `null` = auto-detect) to `TinyVectors` and `BlobSVG`; a boolean overrides detection entirely. Adds the `resolveDark()` helper to the themes surface.
- `themes/css` (`vector-colors.css`): dark overrides now also match `[data-mode='dark']`, corrects the header comment that claimed Skeleton toggles a `.dark` class, and ships a `--tv-blend` seam (`multiply` in light, `screen` in dark) under both selector families.

## 0.3.4 - 2026-07-05

- Fixes the root `"."` export's `svelte` condition to point at the full root barrel (`./dist/index.js`) instead of the components-only `./dist/svelte/index.js`. The two conditions exposed divergent API surfaces on the same specifier: bundlers resolving with the `svelte` condition (Vite consumers) could not see root-barrel exports like `getThemeCatalog`, breaking `@tummycrypt/tinyland-stores`' theme catalog import in consumer graphs. The root barrel is a strict superset (it re-exports `TinyVectors`/`BlobSVG`), and components ship pre-compiled `.js`, so no raw-svelte resolution is lost. The `./svelte` subpath is unchanged.

## 0.3.3 - 2026-07-05

- Makes the Bazel vite build CWD-independent (same pattern as the 0.3.2 build-declarations fix): `tinyvectors_build` now runs through `scripts/build-vite.mjs`, which anchors cwd to the package root so `dist/` materializes correctly when the package builds as an external Bazel module (previously the declared `dist/` TreeArtifact shipped empty in consumer graphs, breaking SSR imports of `@tummycrypt/tinyvectors`).

## 0.3.2 - 2026-06-15

- Makes the Bazel declarations build CWD-independent: `tinyvectors_declarations` runs through `scripts/build-declarations.mjs`, which anchors cwd to the package root so `dist-types/` materializes correctly when the package builds as an external Bazel module.

## 0.3.1 - 2026-05-31

- Adds `getThemeCatalog()` and `getThemeCatalogEntry()` (with `getThemePreviewColors()`/`getThemeVectorColors()`) so the package is the single source of truth for which themes ship and how they preview; hub/spoke consumers such as `@tummycrypt/tinyland-stores` render this catalog (TIN-1746).
- CI: moves the package lane to a repo-owned runner and onto the Node 24 reusable package workflow.

## 0.3.0 - 2026-05-01

- Restores the pre-Phase-A gel/blob feel while keeping gravity-led motion, ambient movement, and safer smoothing.
- Adds device-motion status, permission, calibration, idle reset, reduced-motion, and Chrome/CDP browser harness coverage.
- Adds pointer and scroll lifecycle cleanup, stale IO reset behavior, pointer velocity coverage, and a conservative local pointer field.
- Hardens the package release surface with explicit exports, Bazel-built package validation, bundle-size checks, and consumer-package checks.
- Keeps the release bundle under the 12 KiB gzip gate while documenting the remaining 11 KiB target pressure.
