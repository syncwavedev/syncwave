import {sveltekit} from '@sveltejs/kit/vite';
import swc from 'unplugin-swc';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		nodePolyfills({
			include: ['buffer'],
		}),
		swc.vite({
			tsconfigFile: './tsconfig.json',
		}),
	],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
