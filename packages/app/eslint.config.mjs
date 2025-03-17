// @ts-check

import {includeIgnoreFile} from '@eslint/compat';
import pluginJs from '@eslint/js';
import pluginPrettier from 'eslint-config-prettier';
import pluginSvelte from 'eslint-plugin-svelte';
import globals from 'globals';
import {fileURLToPath} from 'node:url';
import tseslint from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

const config = tseslint.config(
	includeIgnoreFile(gitignorePath),
	{languageOptions: {globals: globals.browser}},
	pluginJs.configs.recommended,
	tseslint.configs.recommended,
	pluginSvelte.configs['flat/recommended'],
	pluginPrettier,
	...pluginSvelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'@typescript-eslint/no-empty-object-type': 'off',
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	}
);

export default config;
