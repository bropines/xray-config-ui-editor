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
- **Snippets**: Remnawave config profiles may carry `{ "snippet": "NAME" }` placeholders inside `routing.rules` / `outbounds`; the panel expands them before a node sees the config. `src/core/snippets` is the single source of truth for detecting, validating and (preview-only) expanding them — any new code that iterates rules or outbounds must skip references via `isSnippetRef` instead of linting them, and must never rewrite one in place (that silently unlinks the profile from the panel's central copy). The same module backs the local "templates" library in `configStore.snippetLibrary`.
- **Config generators**: `src/core/generators/local-balancer.ts` builds whole *client* configs (local inbounds + balancer + probe + bypass) from a list of nodes. It is pure — no store, no clock, no randomness — so it is unit-tested directly; keep it that way and put UI state in `src/hooks/useLocalBalancerBuilder.ts` instead. The five things that must agree in such a config (tag prefix, balancer selector, probe subjectSelector, catch-all rule's balancerTag, bypass list duplicated into DNS) are derived there — don't reintroduce them as separate inputs.
- **Panel-derived client outbounds**: `src/core/generators/client-outbound.ts` mirrors a Remnawave *host* + the inbound it references into a client outbound, deriving the REALITY public key from the inbound's private key. Its counterpart is `buildLocalBalancerTemplate()`, which emits an `XRAY_JSON` subscription template carrying `remnawave.injectHosts` instead of inline proxies — that is how a panel hands one balanced config to every subscriber. Both are pure; the panel round-trip lives in the store (`fetchPanelCatalog`, `fetchSubscriptionTemplates`, `saveSubscriptionTemplate`), whose state is deliberately session-only.
- **Reading a balancer back**: `parseLocalBalancer()` (same module as the builders) turns a template or client config into the options that would rebuild it, and reports in `notes` whatever it could not represent. Keep it symmetric with the builders — the round-trip tests in `local-balancer.test.ts` are what stop the two from drifting.
- **Modals on mobile**: a two-column modal must show one pane at a time below `md` — with both mounted the second column collapses to zero height and everything in it, including its buttons, becomes unreachable. `RoutingModal` (mobileEditMode), `LocalBalancerModal` (mobilePane), `SnippetsModal` and `TemplatesModal` (draft presence) all do this; copy one of them rather than inventing a third layout.
- **Defaults and curated lists** live in `src/core/presets/**`, never inline at a call site: `dns.ts` (resolvers, default upstream, `createDefaultDns()`) and `bypass-domains.ts` (`BYPASS_LISTS` plus the split/compose helpers the builder round-trips through). If you need `1.1.1.1` or a domain list in new code, import it from there — the point of the module is that there is one copy to change.
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
