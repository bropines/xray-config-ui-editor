import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Kept deliberately minimal: this codebase has ~80 pre-existing tsc errors
// and heavy `any` usage (see the architecture audit), so turning on
// typescript-eslint's `strict`/type-checked presets here would produce
// thousands of warnings on day one and make this config noise instead of
// signal. Only two things matter right now:
//  1. react-hooks correctness (catches real bugs — conditional hooks,
//     missing deps — cheaply, with no project-wide type info needed).
//  2. The ui/ store-independence boundary from the UI/logic decoupling
//     plan: src/components/ui/** must never import the Zustand store, or
//     the "rewrite any element's markup without touching its wiring" goal
//     regresses silently over time as new ui/ components get added.
// Tighten this incrementally later (per-directory overrides, then
// eventually strict/type-checked) rather than all at once.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/core/xray-config.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // `rules-of-hooks` stays an error (it caught a real pre-existing bug
      // in OutboundWireguard.tsx — see its git history). `set-state-in-effect`
      // is a much newer, more opinionated rule that flags the extremely
      // common "setLoading(true) at the top of a data-fetching effect"
      // pattern used throughout this codebase's ~16 fetch hooks; fixing all
      // of them (toward derived-state/reducer patterns) is real, separate
      // refactoring work, not something to block a first `bun run lint` on.
      'react-hooks/set-state-in-effect': 'warn',

      // The whole codebase currently relies on `any` heavily (protocol
      // configs are duck-typed against Xray-core's JSON shape) — this isn't
      // the fight this config is picking. Revisit once the Zod schemas are
      // the single source of truth end to end.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Extraction hooks (useRuleEditor, useConfigDashboardLogic, etc.) and
      // schema-driven helpers legitimately need empty interfaces / require()
      // in a couple of .cjs scripts; don't fight the whole codebase over it.
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    // The Node/CommonJS build scripts (schema generator, discovery diff
    // tool) aren't part of the app bundle — they run under `node` directly,
    // so they get Node globals and are allowed require()/module.exports.
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // The ui/ store-independence boundary — see src/hooks/useField.ts and
    // the "Phase 2" plan notes for why this matters. If a ui/ component
    // needs store data, it belongs on a prop, not a direct import here.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/store/configStore', '**/store/configStore.ts', 'zustand'],
          message: 'src/components/ui/** must stay store-independent — pass data in as props instead. See the UI/logic decoupling plan.',
        }],
      }],
    },
  },
);
