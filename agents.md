# 🛠 Xray Config UI Editor: Development Guide

This guide describes the project-specific conventions and technical stack for the Xray Config UI Editor.

## 🚀 Quick Start
- **Runtime**: Bun (use `bun install`, `bun run dev`, `bun run build`)
- **Main Stack**: React 19 + Vite 7 + Tailwind CSS 4 + TypeScript.
- **State**: Zustand 5 + Immer (central store at `src/store/configStore.ts`).

## 📦 Architecture & Logic
- **Configuration Schema**: The source of truth is hand-authored Zod, in `src/core/xray/schemas/**`. `src/utils/config.schema.json` is auto-generated (`bun run schema:generate`, from Xray-core's Go sources) and only backs the raw-JSON editor's Ajv linter — the two can drift; see `ROADMAP.md` item C before assuming they agree.
- **Validation**: `src/core/validators/index.ts` (Zod-based) and `src/core/diagnostics/index.ts` (`runFullDiagnostics`, semantic checks). `saveToRemnawave()`/`saveActiveProfile()` in `configStore.ts` gate on `runFullDiagnostics` critical findings.
- **Store Actions**: Use `useConfigStore` and its actions (`updateSection`, `addItem`, `updateItem`, `saveToRemnawave`) for any state changes.
- **Topology**: Traffic flow visualization is managed by `@xyflow/react` (React Flow) in `src/components/topology/`.
- **UI/store boundary**: `src/components/ui/**` must never import `useConfigStore` — enforced by an ESLint rule (`eslint.config.js`), not just convention. Editors bind fields via `useField`/`useArrayField` (`src/hooks/useField.ts`) instead of hand-rolled `onChange(path, value)` wiring; see `src/components/editors/inbound/InboundClients.tsx` as the reference example.

## 🎨 UI Guidelines
- **Modals**: All editing forms live in `src/components/editors/`.
- **Styling**: Tailwind 4, compiled at build time via `@tailwindcss/vite` (`vite.config.ts` + `src/index.css`) — not a runtime CDN script. Custom component classes (`input-base`, `label-xs`, ...) live in `src/index.css`.
- **Icons**: Use `@phosphor-icons/react` for consistency.

## 🔖 Releases & Changelog
- **Version format**: `v{TAG}-{GIT-HASH}` (e.g. `v1.0.0-a1b2c3d`), dynamically embedded into the app header/about modal.
- **Tag-based deployment**: Pushing a version tag (e.g. `git tag -a v1.0.0 -m "Release v1.0.0"` and `git push origin v1.0.0`) automatically triggers GitHub Actions to:
  1. Build & deploy the website to GitHub Pages.
  2. Create a clean GitHub Release (without attaching binary asset files).
- **Changelog**: All user-facing features and fixes must be recorded in `changelog.md` starting from `[1.0.0]`.

## 💡 Best Practices
1. **State updates — NOT always `produce`**: Most config-mutating actions in `configStore.ts` (`updateSection`, `addItem`, `updateItem`, `deleteItem`, `moveItem`, `reorderRules`, ...) deliberately do NOT use immer's `produce`. They go through `resolveMutableConfig()`, which parses `rawConfigText` via `parseJsonc` (preserving user comments) and mutates that plain object directly. **This is load-bearing, not incidental** — `immer.produce()` silently strips `comment-json`'s comment metadata on any nested mutation, even on a correctly-parsed object (verified empirically, see `src/utils/jsonc.test.ts` and commit `6a7a0f8`). Simple top-level state replacements (`state.config = newConfig`, `state.remnawave.token = ...`) still use `produce` safely — the danger is only in deep-mutating an already-comment-parsed config object. See `ROADMAP.md` before touching this.
2. **Type Safety**: Ensure all new config parts match the TypeScript interfaces in `configStore.ts`.
3. **No Backend**: Remember, this is a **static** web app; all logic must be browser-compatible.
4. **NO BINARIES**: Never commit images, screenshots, or any binary files. Use `.gitignore` and keep UI documentation external.
5. **Verify every change** with: `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun test`, `bun run build`. The project carries a fixed baseline of pre-existing tsc errors (~80, unrelated to this codebase's actual behavior) — compare error *counts/messages* before/after your change rather than expecting zero, and never let a change add a genuinely new one.
