import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

function outputFileName(chunkName: string): string {
	const withoutSvelte = chunkName.replace(/\.svelte$/, '');
	const srcIndex = withoutSvelte.lastIndexOf('/src/');
	const packageRelative =
		srcIndex >= 0 ? withoutSvelte.slice(srcIndex + '/src/'.length) : withoutSvelte.replace(/^src\//, '');

	return `${packageRelative.replace(/^\/+/, '')}.js`;
}

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				
				runes: true,
			},
		}),
	],

	build: {
		lib: {
			entry: {
				index: resolve(import.meta.dirname, 'src/index.ts'),
				'core/index': resolve(import.meta.dirname, 'src/core/index.ts'),
				'motion/index': resolve(import.meta.dirname, 'src/motion/index.ts'),
				'themes/index': resolve(import.meta.dirname, 'src/themes/index.ts'),
				'svelte/index': resolve(import.meta.dirname, 'src/svelte/index.ts'),
			},
			formats: ['es'],
		},

		// Vite 8 bundles with Rolldown; `rollupOptions` is only a deprecated alias.
		rolldownOptions: {
			external: [/^svelte($|\/)/],
			output: {
				preserveModules: true,
				preserveModulesRoot: 'src',
				// Strip .svelte from compiled output filenames to prevent
				// downstream vite-plugin-svelte from re-processing them.
				// BlobSVG.svelte → BlobSVG.js (not BlobSVG.svelte.js)
				entryFileNames: (chunkInfo) => outputFileName(chunkInfo.name),
				chunkFileNames: (chunkInfo) => outputFileName(chunkInfo.name),
				assetFileNames: '[name][extname]',
			},
			treeshake: {
				moduleSideEffects: false,
				propertyReadSideEffects: false,
			},
		},

		
		sourcemap: true,

		
		emptyOutDir: true,

		
		target: 'es2022',

		
		// Vite 8 default minifier (Oxc); esbuild is no longer a Vite dependency.
		minify: true,
	},

	
	resolve: {
		alias: {
			$lib: resolve(import.meta.dirname, 'src'),
		},
	},
});
