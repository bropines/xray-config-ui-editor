# Changelog

All notable changes to this project will be documented in this file.

## [1.0.14] - 2026-08-31

### Added
- **DurationInput & Time Unit Dropdown (`ms`, `s`, `m`, `h`)**:
  - Added new `DurationInput` component with numeric input, stepper controls, and a time unit selector dropdown (`ms`, `s`, `m`, `h`).
  - Implemented smart parsing to automatically detect pasted or typed units (e.g. `500ms`, `2m`, `10s`).
  - Integrated `DurationInput` across all configuration forms via `SchemaField` / `SchemaForm` and custom editors:
    - **Observatory**: `probeInterval`
    - **Burst Observatory**: `interval`, `timeout`
    - **Balancer (LeastLoad)**: `maxRTT`, `baselines`
    - **Policy Level 0**: `handshake`, `connIdle`, `uplinkOnly`, `downlinkOnly`
    - **DNS / DNS Server**: `timeoutMs`, `serveExpiredTTL`
    - **Inbound Allocate**: `refresh`
    - **Transport Sockopt**: `tcpKeepAliveIdle`, `tcpKeepAliveInterval`, `tcpUserTimeout`
    - **Transport XHTTP**: `scMinPostsIntervalMs`, `hKeepAlivePeriod`
    - **Transport gRPC**: `idle_timeout`, `health_check_timeout`
    - **Transport Finalmask (QUIC)**: `max_idle_timeout`, `handshake_timeout`
    - **Transport Reality**: `maxTimeDiff`
    - **Routing Webhook**: `deduplication`

### Fixed
- **Input Character Restriction in Duration Fields**:
  - Resolved browser-level `<input type="number">` restrictions that blocked typing letters (`s`, `m`, `ms`, `h`).
  - Updated Zod schemas in `routing.schema.ts` and `observatory.schema.ts` to accept duration string and number unions.

## [1.0.12] - 2026-08-24

### Fixed
- **Resolved QuotaExceededError via IndexedDB Storage Engine**:
  - Migrated Zustand persist storage from `localStorage` to **IndexedDB** (`idbStorage`), eliminating the ~5MB synchronous browser quota limit when storing large configurations, multiple profiles, and version snapshots.
  - Added seamless automatic migration from legacy `localStorage` to IndexedDB upon startup, safely freeing occupied quota in the browser.
  - Fixed state mutation in `setHistoryLimit` to properly prune per-profile history entries in `state.histories`.

## [1.0.11] - 2026-08-20

### Security
- **Dependabot Security Fixes**:
  - Updated `fast-uri` to `3.1.5` to resolve authority delimiter & introducer host confusion vulnerabilities (GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7).
  - Updated `postcss` to `8.5.26` and `nanoid` to `3.3.18` to resolve path traversal in source map auto-loading and loop vulnerabilities (GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp, GHSA-28wg-ghj8-5hjv).
  - Resolved 100% of open Dependabot security advisories (`found 0 vulnerabilities`).

## [1.0.10] - 2026-08-20

### Added
- **Interactive JsonEditor in Configuration Harvester**:
  - Replaced plain text area with full CodeMirror `JsonEditor` featuring syntax highlighting, line numbers, and JSON formatting.
  - Added automatic JSON beautification on remote fetch and a dedicated **Beautify JSON** button.
- **Copy Analyzed Payload & Persistent Source Navigation**:
  - Added **Copy Analyzed Response** button directly to the Harvester dashboard header to quickly copy raw responses/payloads without re-querying.
  - Added **Source** button in the sidebar to inspect or edit the original payload without losing state.

## [1.0.9] - 2026-08-20

### Added
- **Full Client System Emulation for Remnawave HWID**:
  - Added OS (`x-device-os`), OS Version (`x-ver-os`), and Device Model (`x-device-model`) inputs to Harvester.
  - Added **Auto-Detect System** button to instantly populate Windows/iOS/Android/macOS parameters.
  - Enabled custom HWID pasting from existing clients (e.g. Throne / v2rayTun) to reuse existing device slots and bypass "Too many devices" 1-device limits.

## [1.0.8] - 2026-08-20

### Added
- **Remnawave HWID & Device Identifier Protocol**:
  - Implemented canonical Remnawave subscription headers (`x-hwid`, `x-device-os`, `x-ver-os`, `x-device-model`, `x-app-version`) in `ConfigInspectorModal`.
  - Added Device HWID manager with UUID generation, clipboard copying, and persistent `localStorage` cache.
  - Added specific error detection and alerts for Remnawave HWID device limits (`x-hwid-max-devices-reached`, `403/429`).

## [1.0.7] - 2026-08-20

### Added
- **Universal Configuration & Link Harvester**:
  - Added multi-protocol link parser in `ConfigInspectorModal` to harvest line-by-line proxy links (`vless://`, `vmess://`, `ss://`, `trojan://`), Base64 subscription blobs, and WireGuard configurations directly.
  - Added **Emulated Client (User-Agent)** selector (`Happ`, `v2rayNG`, `Shadowrocket`, `Clash.Meta`, `sing-box`, `FoXray`, `NekoBox`, or custom UA string) to avoid user-agent blocks and restrictions on VPN subscription endpoints.
  - Added warning detection when providers return advisory dummy announcement nodes (`0.0.0.0:1`).

## [1.0.6] - 2026-08-20

### Fixed
- **Missing Imports & Runtime References**:
  - Resolved `ReferenceError` for `ExtendedSection` and `Switch` in `SockoptEditor` and `RuleEditor`.
  - Resolved `ReferenceError` for `useState` in `DnsModal`.
- **Routing & Topology Modal Scrolling**:
  - Restored full scrollability and height constraints in `RoutingModal` rule lists, rule editor forms, and balancers.

## [1.0.5] - 2026-08-20

### Added
- **Extended & Experimental Settings System**:
  - Introduced collapsible `ExtendedSection` across all modal editors to manage advanced Xray-core parameters without cluttering primary workflows.
  - **Inbound Port Allocation & Hopping (`allocate`)**: Added dynamic port allocation with strategy (`always` / `random`), rotation intervals, and concurrency limits.
  - **Outbound Advanced Routing**: Added full 11-mode Target Domain Strategy (`targetStrategy`) and Transport Layer Chaining (`proxySettings.transportLayer`).
  - **Sockopt & Kernel Features**: Added RFC 8305 Dual-Stack Happy Eyeballs (`happyEyeballs`), `penetrate` sockopt inheritance, and `addressPortStrategy`.
  - **REALITY & TLS Extended Controls**: Added Post-Quantum ML-DSA-65 client verification (`mldsa65Verify`), Certificate Pinning (`pinnedPeerCertSha256`), `rejectUnknownSni`, `masterKeyLog` (`SSLKEYLOGFILE`), custom cipher suites, and session resumption.
  - **Routing & DNS Extended Options**: Added rule tagging (`ruleTag`) for Prometheus/stats, stale DNS cache serving (`serveStale`, `serveExpiredTTL`), and DNS fallback/cache strategies.

## [1.0.4] - 2026-08-20

### Added
- **Inbound REALITY Client Versioning & Controls**:
  - Enabled visual configuration of `minClientVer` and `maxClientVer` in the Inbound REALITY editor.
  - Added fields and descriptions for `maxTimeDiff` and `mldsa65Seed` (Post-Quantum ML-DSA-65) in `SchemaForm`.

### Fixed
- **Modal Viewport & Empty Space Glitch**:
  - Resolved an issue where desktop modals displayed an empty lower third and restricted scrolling within a narrow 60vh container.
  - Converted editor content containers (`EditorLayout`, `RoutingModal`, `TopologyModal`) to responsive full-height flex layouts (`flex-1 min-h-0`).

## [1.0.3] - 2026-08-18

### Fixed
- **Remnawave Cloud Profile Loading & Caching**:
  - Fixed `ReferenceError` in `loadConfig` when parsing loaded profile configuration data.
  - Added `cache: 'no-cache'` and robust response body parsing in `RemnawaveClient` to prevent browser ETag conditional caching (`304 Not Modified` / `If-None-Match`) failure across origins.
  - Added explicit console error logging for Remnawave profile actions.

## [1.0.2] - 2026-08-18

### Added
- **SEO & Search Indexing Optimization**:
  - Added comprehensive SEO meta tags (title, description, canonical link, Open Graph, Twitter Cards).
  - Added Schema.org `WebApplication` structured data (`JSON-LD`).
  - Added crawler fallback and noscript content inside root HTML for fast indexing by Google and Yandex.
  - Added `robots.txt` and `sitemap.xml` in `public/` for automatic search engine discovery.

## [1.0.1] - 2026-08-11

### Fixed
- **Comprehensive JSON Comment Preservation**: Extended raw text comment preservation (`rawText`) across **all** modal editors and sub-editors (Inbounds, Outbounds, Routing Rules & Balancers, DNS & FakeDNS, General Settings, Reverse Proxy, and Section JSON modals). Toggling between UI Mode and JSON Mode in any editor now preserves 100% of comments (`//`, `/* */`), formatting, and custom spacing.
- **Slash Typing Visual Glitch**: Fixed a visual issue in CodeMirror (`JsonEditor.tsx`) where typing a single slash `/` caused the character to temporarily obscure or disappear under the syntax error underline before completing `//`.

### Changed
- **Changelog Release Notes Integration**: Updated GitHub Actions release workflow (`deploy.yml`) to automatically extract the latest version notes from `changelog.md` into GitHub Release descriptions upon pushing tags (`v*`).

## [1.0.0] - 2026-08-10

### Added
- **Telegram Channel Link**: Added a direct button link to the Telegram channel ([@xcue_dev](https://t.me/xcue_dev)) in topbar navigation next to Docs and inside the About modal.
- **Interactive Chip Drag & Drop**: Enabled long-press (> 1.5s) drag-and-drop reordering for tag chips in `SmartTagInput` (used in Routing domains, IPs, inbounds, protocols, etc.) with animated holding progress indicator.
- **Tag Sorting Controls**: Added tag sorting menu offering:
  - 🔤 **Alphabetical (A-Z)**
  - 🏷️ **Geosite / GeoIP first** (puts `geosite:` or `geoip:` prefixed items first)
  - 🌐 **Plain items first** (puts plain domain/IP items first)
- **Dynamic Versioning**: Displaying `v{TAG}-{GIT-HASH}` dynamically in the app About modal via Vite build parameters.
- **Tag-Based GitHub Release Workflow**: Configured GitHub Actions to automatically deploy to GitHub Pages and publish clean GitHub Releases (without attached binary files) upon pushing tags matching `v*`.
- **Contributor Notice & Project Vibe**: Added prominent callout section to `README.md` inviting contributors and highlighting the project vibe.
