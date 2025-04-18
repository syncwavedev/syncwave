// @ts-check

import {includeIgnoreFile} from '@eslint/compat';
import {default as eslint} from '@eslint/js';
import pluginPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier/recommended';
import {default as pluginSvelte, default as svelte} from 'eslint-plugin-svelte';
import globals from 'globals';
import {fileURLToPath} from 'node:url';
import tseslint from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

const config = tseslint.config(
    includeIgnoreFile(gitignorePath),
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    ...svelte.configs.recommended,
    {
        languageOptions: {
            globals: globals.browser,
        },
    },
    pluginSvelte.configs['flat/recommended'],
    pluginPrettier,
    ...pluginSvelte.configs['flat/prettier'],
    {
        rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
            'svelte/no-at-html-tags': 'off',
        },
    }
);

export default config;
