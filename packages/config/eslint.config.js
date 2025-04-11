// @ts-check

import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'packages/app/dist/',
            'packages/lib/dist/',
            'packages/server/dist/',
            'packages/server/ui/',
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    prettier,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            'prettier/prettier': 'error',
            'block-scoped-var': 'error',
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'eol-last': 'error',
            'prefer-arrow-callback': 'error',
            'no-trailing-spaces': 'error',
            quotes: ['warn', 'single', {avoidEscape: true}],
            'no-restricted-properties': [
                'error',
                {
                    object: 'describe',
                    property: 'only',
                },
                {
                    object: 'it',
                    property: 'only',
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        "CallExpression[callee.object.name='Promise'][callee.property.name='all']",
                    message: 'use whenAll instead (it awaits all errors).',
                },
            ],
            'no-restricted-globals': [
                'error',
                {
                    name: 'Error',
                    message: 'Use AppError instead.',
                },
            ],
            '@typescript-eslint/require-await': 'off',
            'no-empty-pattern': 'off',
            'no-console': 'error',
            'no-constant-condition': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unused-vars': [
                'off',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    }
);
