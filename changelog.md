# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-06-01

### Added
- **Dynamic Schema-Driven UI Components**: Introduced the `SchemaForm` component to generate config forms dynamically from Zod schemas.
- **Support for Primitive Arrays**: Configured `SchemaField` to render lists (like IP addresses, CIDR, domains) as comma-separated text inputs, parsing them back to typed arrays automatically.
- **Interactive JSON Schema Autocompletion**: Integrated dynamic runtime transformation of Zod schemas to JSON Schema (via `zod-to-json-schema`), driving autocomplete and validation inside the CodeMirror raw JSON view.

### Changed
- **Outbound & Inbound Settings**: Migrated General, TUN, Sniffing, and Client configuration views to `SchemaForm`, reducing boilerplate code.
- **Routing Settings**:
  - Refactored `RuleEditor.tsx` to render advanced matchers (ports, process names, local IPs) and webhook payloads via `SchemaForm`.
  - Refactored `BalancerEditor.tsx` to handle balancer attributes and least-load strategies via nested `SchemaForm` configurations.
- **General Settings**:
  - Replaced manually written forms for logs (`LogEditor.tsx`), gRPC API (`ApiStatsEditor.tsx`), timeouts and system policies (`PolicyEditor.tsx`), and Observatory monitoring (`ObservatoryEditor.tsx`, `BurstObservatoryEditor.tsx`) with schema-driven forms.
- **DNS Settings**:
  - Converted DNS General options, advanced DNS server configurations, and FakeDNS pools to `SchemaForm`, exposing all correct parameters from the Xray-core specification.
- **Button Sizing**: Compacted helper buttons (keys generator, short ID generator) across the app to `sm` size, keeping dialog footer buttons at standard proportions.

### Removed
- **Static JSON Schema**: Deleted `src/utils/config.schema.json` in favor of dynamic schema generation, ensuring a single source of truth.
- **Manual Types**: Removed manually maintained `src/core/types/xray.types.ts` in favor of Zod inferred types.
