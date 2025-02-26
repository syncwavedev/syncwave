import {sveltekit} from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import swc from 'unplugin-swc';
import type {PluginOption} from 'vite';
import checker from 'vite-plugin-checker';
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
		tailwindcss(),
		sveltekit() as PluginOption,
		nodePolyfills({
			// required for bytewise package
			include: ['buffer'],
		}) as PluginOption,
		checker({typescript: true}),
		{
			// we need swc to transform async/await for zonejs to work
			// in dev mode, prod build will be processed by esbuild
			...swc.vite({tsconfigFile: false}),
			apply: 'serve',
		},
	],

	optimizeDeps: {
		esbuildOptions,
	},

	esbuild: esbuildOptions,

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
