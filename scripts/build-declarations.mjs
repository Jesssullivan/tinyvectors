import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = new URL('../', import.meta.url);
const declarationsConfig = new URL('../tsconfig.declarations.json', import.meta.url);
// TypeScript 7 exposes only package.json and its version stub through the
// exports map, so resolve the `tsc` bin through package.json (RU13).
const tscPackageJson = require.resolve('typescript/package.json');
const tscManifest = JSON.parse(readFileSync(tscPackageJson, 'utf8'));
const tscPath = join(
	dirname(tscPackageJson),
	typeof tscManifest.bin === 'string' ? tscManifest.bin : tscManifest.bin.tsc,
);
const result = spawnSync(process.execPath, [tscPath, '-p', declarationsConfig.pathname], {
	cwd: packageRoot,
	stdio: 'inherit',
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

await import('./copy-svelte-declarations.mjs');
