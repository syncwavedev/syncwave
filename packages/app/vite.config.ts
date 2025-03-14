import {sveltekit} from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import type {PluginOption} from 'vite';
import checker from 'vite-plugin-checker';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import {defineConfig} from 'vitest/config';
// import swc from 'unplugin-swc';

const esbuildOptions = {
	supported: {
		// because of zonejs package
		'async-await': false,
	},
};

export default defineConfig({
	clearScreen: false,
	plugins: [
		tailwindcss() as PluginOption,
		sveltekit() as PluginOption,
		nodePolyfills({
			// because of fdb-tuple package
			include: ['buffer'],
		}) as PluginOption,
		checker({typescript: true}),
		// {
		// 	// we need swc to transform async/await for zonejs to work
		// 	// in dev mode, prod build will be processed by esbuild
		// 	...swc.vite({tsconfigFile: false}),
		// 	apply: 'serve',
		// 	enforce: 'post',
		// } as PluginOption,
	],

	optimizeDeps: {
		esbuildOptions,
	},

	build: {
		sourcemap: true,
	},

	esbuild: esbuildOptions,

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
