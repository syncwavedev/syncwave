import {svelte} from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import babel from 'vite-plugin-babel';
import checker from 'vite-plugin-checker';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import {defineConfig} from 'vitest/config';

const esbuildOptions = {
	supported: {
		// because of zonejs package
		'async-await': false,
	},
};

export default defineConfig({
	clearScreen: false,
	plugins: [
		tailwindcss(),
		svelte(),
		nodePolyfills({
			// because of fdb-tuple package
			include: ['buffer'],
		}),
		checker({typescript: true}),
		{
			...babel(),
			apply: 'serve',
			enforce: 'post',
		},
		// {
		// 	// we need swc to transform async/await for zonejs to work
		// 	// in dev mode, prod build will be processed by esbuild
		// 	...swc.vite({tsconfigFile: false}),
		// 	apply: 'serve',
		// 	// enforce: 'post',
		// },
	],

	optimizeDeps: {
		esbuildOptions,
		exclude: [],
	},

	build: {
		sourcemap: true,
	},

	esbuild: esbuildOptions,

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
