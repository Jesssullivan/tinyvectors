import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const devServerPort = Number(process.env.TINYVECTORS_VITE_PORT ?? 5175);
const hmrPort = Number(process.env.TINYVECTORS_VITE_HMR_PORT ?? 24679);

export default defineConfig({
	root: resolve(import.meta.dirname, 'dev'),

	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
			},
		}),
	],

	resolve: {
		alias: {
			$lib: resolve(import.meta.dirname, 'src'),
		},
	},

	server: {
		port: devServerPort,
		open: process.env.CI === 'true' ? false : true,
		hmr: {
			port: hmrPort,
		},
	},
});
