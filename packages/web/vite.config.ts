import {sveltekit} from '@sveltejs/kit/vite';
import type {PluginOption} from 'vite';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import {defineConfig} from 'vitest/config';

const esbuildOptions = {
	supported: {
		// required for zonejs package
		'async-await': false,
	},
};

export default defineConfig({
	plugins: [
		sveltekit() as PluginOption,
		nodePolyfills({
			// required for bytewise package
			include: ['buffer'],
		}) as PluginOption,
	],

	optimizeDeps: {
		esbuildOptions,
	},

	esbuild: esbuildOptions,

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
