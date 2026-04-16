---
name: xray-ui-dev
description: Development and maintenance of Xray Config UI Editor. Use this skill when modifying the React frontend, Zustand store, Xray-core configuration logic, or Remnawave integration.
---

# Xray UI Dev

This skill provides specialized knowledge for developing the Xray Config UI Editor, a static web-based GUI for Xray-core.

## Tech Stack & Workflow

- **Runtime**: Bun (use `bun install`, `bun run dev`, `bun run build`)
- **Frontend**: React 19 (TypeScript), Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5 + Immer (see `src/store/configStore.ts`)
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Visuals**: React Flow (`@xyflow/react`) for topology visualization
- **Editor**: Monaco Editor (`@monaco-editor/react`) for JSON editing

## State Management (Zustand)

The application state is managed in `src/store/configStore.ts`.
- Use `useConfigStore` to access the Xray configuration and Remnawave state.
- Actions use `immer` for immutable updates.
- Configuration is persisted in `localStorage` under `xray-config-storage`.

### Common Actions
- `updateSection(section, data)`: Replaces a top-level Xray config section.
- `addItem(section, item)`: Adds an inbound or outbound.
- `updateItem(section, index, item)`: Updates a specific item in a list.
- `saveToRemnawave()`: Pushes the current config to the linked Remnawave profile.

## Xray Configuration Logic

- **Schema**: Valid Xray-core configuration is defined in `src/utils/config.schema.json`.
- **Validation**: Critical validation (e.g., for balancers) is performed before saving to Remnawave (see `src/utils/validator.ts`).
- **Protocols**: Supports VMess, VLESS, Trojan, Shadowsocks, Hysteria2, Wireguard, etc.

## UI Components

- **Modals**: Most editing happens in modals located in `src/components/editors/`.
- **UI Elements**: Reusable components are in `src/components/ui/` (Button, Icon, Modal, etc.).
- **Topology**: Traffic flow visualization is in `src/components/topology/`.

## Key Files to Reference

- `src/store/configStore.ts`: Central state and logic.
- `src/utils/config.schema.json`: Complete Xray-core config specification.
- `src/utils/remnawave-client.ts`: API client for Remnawave integration.
- `src/utils/validator.ts`: Configuration validation logic.

## Best Practices

1. **Type Safety**: Always maintain strict TypeScript types for Xray config objects.
2. **Immutability**: Use `produce` from `immer` when updating the store to avoid direct state mutation.
3. **Validation**: Add validation logic for new config sections to prevent Xray-core from crashing.
4. **Tailwind 4**: Use modern Tailwind 4 features for styling.
