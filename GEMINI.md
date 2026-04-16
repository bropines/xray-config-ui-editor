# 🛠 Xray Config UI Editor: Development Guide

This guide describes the project-specific conventions and technical stack for the Xray Config UI Editor.

## 🚀 Quick Start
- **Runtime**: Bun (use `bun install`, `bun run dev`, `bun run build`)
- **Main Stack**: React 19 + Vite 7 + Tailwind CSS 4 + TypeScript.
- **State**: Zustand 5 + Immer (central store at `src/store/configStore.ts`).

## 📦 Architecture & Logic
- **Configuration Schema**: Strict Xray-core configuration is defined in `src/utils/config.schema.json`.
- **Validation**: Always use/update `src/utils/validator.ts` before pushing changes to Remnawave.
- **Store Actions**: Use `useConfigStore` and its actions (`updateSection`, `addItem`, `saveToRemnawave`) for any state changes.
- **Topology**: Traffic flow visualization is managed by `@xyflow/react` (React Flow) in `src/components/topology/`.

## 🎨 UI Guidelines
- **Modals**: All editing forms live in `src/components/editors/`.
- **Styling**: Prefer Vanilla CSS or Tailwind 4 utility classes.
- **Icons**: Use `@phosphor-icons/react` for consistency.

## 💡 Best Practices
1. **Never mutate state directly**: Always use `produce` from `immer` within store actions.
2. **Type Safety**: Ensure all new config parts match the TypeScript interfaces in `configStore.ts`.
3. **No Backend**: Remember, this is a **static** web app; all logic must be browser-compatible.
