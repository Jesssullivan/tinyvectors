import { spawn } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// RU13: TypeScript 7.0.2 is this package's `typescript`, so svelte-check runs
// in its native mode (`--tsgo`): svelte2tsx writes the transpiled components
// to `.svelte-check/` and TypeScript 7 (`typescript/bin/tsc`) checks them
// together with every .ts file the tsconfig includes.
// patches/svelte-check@4.7.6.patch (copied from xoxd-ai/site.scaffold) lets
// `--tsgo` find TypeScript 7 as `typescript` itself.
//
// Usage: run-svelte-check.mjs <tsconfig.json> [--canary]
//
// Bazel inputs are read-only and --tsgo writes `.svelte-check/`, so the check
// runs in a writable scratch copy of src/ and tsconfig.json whose
// node_modules links back to the declared package root.
//
// --canary seeds one .ts and one .svelte type error and fails unless
// svelte-check reports both. Under --tsgo a tsconfig that checks nothing
// reports 0 errors (sveltejs/language-tools#3136); the canary keeps such a
// false green visible.

const require = createRequire(import.meta.url);
const svelteCheckCli = resolve(
	dirname(require.resolve('svelte-check/package.json')),
	'bin/svelte-check',
);

const args = process.argv.slice(2);
const canary = args.includes('--canary');
const tsconfigArgument = args.find((argument) => argument !== '--canary');
if (!tsconfigArgument) throw new Error('usage: run-svelte-check.mjs <tsconfig.json> [--canary]');

const packageRoot = dirname(resolve(tsconfigArgument));
const scratch = mkdtempSync(join(process.env.TEST_TMPDIR ?? tmpdir(), 'tinyvectors-svelte-check-'));
const cleanup = () => rmSync(scratch, { recursive: true, force: true });

cpSync(join(packageRoot, 'src'), join(scratch, 'src'), { recursive: true, dereference: true });
// copyFileSync follows the Bazel input symlink (cpSync with dereference does
// not for a single file on Node 22.22).
copyFileSync(join(packageRoot, 'tsconfig.json'), join(scratch, 'tsconfig.json'));
symlinkSync(join(packageRoot, 'node_modules'), join(scratch, 'node_modules'), 'dir');

const CANARY_TS = 'src/__tsgo_canary__.ts';
const CANARY_SVELTE = 'src/__TsgoCanary__.svelte';
if (canary) {
	mkdirSync(join(scratch, 'src'), { recursive: true });
	writeFileSync(join(scratch, CANARY_TS), "export const canary: number = 'not a number';\n");
	writeFileSync(
		join(scratch, CANARY_SVELTE),
		"<script lang=\"ts\">\n\tconst canary: number = 'not a number';\n</script>\n\n<p>{canary}</p>\n",
	);
}

const child = spawn(
	process.execPath,
	[
		svelteCheckCli,
		'--tsgo',
		'--tsconfig',
		'./tsconfig.json',
		...(canary ? ['--output', 'machine'] : []),
	],
	{ cwd: scratch, stdio: canary ? ['ignore', 'pipe', 'inherit'] : 'inherit' },
);

let output = '';
child.stdout?.on('data', (chunk) => {
	output += chunk;
	process.stdout.write(chunk);
});

child.on('error', (error) => {
	cleanup();
	console.error(error);
	process.exit(1);
});

child.on('exit', (code) => {
	cleanup();
	if (!canary) process.exit(code ?? 1);
	const errorLines = output.split('\n').filter((line) => / ERROR /u.test(line));
	const missing = [CANARY_TS, CANARY_SVELTE].filter(
		(file) => !errorLines.some((line) => line.includes(file)),
	);
	if (code === 0 || missing.length > 0) {
		console.error(
			`svelte-check --tsgo canary FAILED: exit ${code}; seeded errors not reported in ${missing.join(', ') || '(none)'}`,
		);
		process.exit(1);
	}
	console.log('svelte-check --tsgo canary: both seeded type errors were reported, the gate is live');
	process.exit(0);
});
