// @ts-check

import {includeIgnoreFile} from '@eslint/compat';
import {default as eslint, default as pluginJs} from '@eslint/js';
import pluginPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier/recommended';
import pluginSvelte from 'eslint-plugin-svelte';
import globals from 'globals';
import {fileURLToPath} from 'node:url';
import tseslint from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

const config = tseslint.config(
	includeIgnoreFile(gitignorePath),
	eslint.configs.recommended,
	prettier,
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
