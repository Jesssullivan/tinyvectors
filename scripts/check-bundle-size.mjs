import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(process.cwd(), process.argv[2] ?? '.');
const distEntry = resolve(packageRoot, 'dist/index.js');
const targetGzipKiB = parsePositiveKiB('TINYVECTORS_TARGET_GZIP_KIB', 11);
const maxGzipKiB = parsePositiveKiB('TINYVECTORS_MAX_GZIP_KIB', 12);
const trackedConsumerModules = ['dist/core/InteractionField.js'];

if (maxGzipKiB < targetGzipKiB) {
	console.error(
		'TINYVECTORS_MAX_GZIP_KIB must be greater than or equal to TINYVECTORS_TARGET_GZIP_KIB',
	);
	process.exit(1);
}

if (!existsSync(distEntry)) {
	console.error(`Bundle entry is missing: ${distEntry}`);
	console.error('Run: pnpm run build');
	process.exit(1);
}

const tempDir = await mkdtemp(join(tmpdir(), 'tinyvectors-bundle-size-'));

try {
	const entry = join(tempDir, 'consumer-entry.js');
	await writeFile(
		entry,
		`
import { TinyVectors } from ${JSON.stringify(distEntry)};
console.log(TinyVectors);
`.trimStart(),
	);

	const output = await build({
		configFile: false,
		logLevel: 'silent',
		build: {
			write: false,
			minify: true,
			target: 'es2022',
			rolldownOptions: {
				input: entry,
				external: (id) => id === 'svelte' || id.startsWith('svelte/'),
				output: {
					format: 'es',
					codeSplitting: false,
				},
			},
		},
	});

	const outputs = Array.isArray(output)
		? output.flatMap((bundle) => bundle.output)
		: output.output;
	const chunks = outputs.filter((item) => item.type === 'chunk');
	const includedModules = new Set(
		chunks.flatMap((chunk) =>
			chunk.moduleIds.map((moduleId) => moduleId.replaceAll('\\', '/')),
		),
	);
	const trackedIncluded = trackedConsumerModules.filter((modulePath) =>
		[...includedModules].some((moduleId) => moduleId.endsWith(`/${modulePath}`)),
	);

	const js = outputs
		.filter((item) => item.type === 'chunk')
		.map((item) => item.code)
		.join('\n');
	const rawKiB = js.length / 1024;
	const gzipKiB = gzipSync(js).length / 1024;
	const targetDelta = gzipKiB - targetGzipKiB;

	console.log(
		[
			`bundle size check for ${relativeFromRepo(distEntry)}`,
			`consumer import: { TinyVectors }`,
			`raw ${rawKiB.toFixed(2)} KiB, gzip ${gzipKiB.toFixed(2)} KiB`,
			`target ${targetGzipKiB.toFixed(2)} KiB, gate ${maxGzipKiB.toFixed(2)} KiB`,
			targetDelta <= 0
				? `target headroom ${Math.abs(targetDelta).toFixed(2)} KiB`
				: `target overage ${targetDelta.toFixed(2)} KiB`,
			trackedIncluded.length > 0
				? `tracked modules included: ${trackedIncluded.join(', ')}`
				: 'tracked modules included: none',
		].join('\n'),
	);

	if (gzipKiB > maxGzipKiB) {
		console.error(
			`Consumer bundle gzip ${gzipKiB.toFixed(2)} KiB exceeds ${maxGzipKiB.toFixed(2)} KiB gate`,
		);
		process.exit(1);
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}

function relativeFromRepo(path) {
	return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path;
}

function parsePositiveKiB(envName, defaultValue) {
	const rawValue = process.env[envName];
	const value = rawValue == null ? defaultValue : Number(rawValue.trim());

	if (!Number.isFinite(value) || value <= 0) {
		console.error(`${envName} must be a positive number`);
		process.exit(1);
	}

	return value;
}
