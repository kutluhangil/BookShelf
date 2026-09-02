import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'spike/**', 'assets/**'],
  },

  {
    // A stale `eslint-disable` is worse than no comment: it reads as a
    // deliberate exemption while silencing nothing. This repository shipped
    // three of them for months before ESLint was installed at all.
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Browser code: React hook rules and the accessibility rules that catch the
  // markup problems a type checker cannot see.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // The React Compiler rules shipped with eslint-plugin-react-hooks v7
      // describe real debt in this codebase — App.tsx drives most of its state
      // through effects — but clearing them is a restructuring job, not a lint
      // fix. They stay visible as warnings until that work lands; the two rules
      // that catch outright mistakes (rules-of-hooks, exhaustive-deps) remain
      // errors and pass today.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },

  // Server and build tooling run on Node.
  {
    files: ['server.ts', 'src/server/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Tests get both environments plus Vitest's globals-free API surface.
  {
    files: ['src/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    rules: {
      // The codebase already prefixes deliberately unused bindings with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  }
);
