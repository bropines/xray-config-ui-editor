# Changelog

All notable changes to this project will be documented in this file.

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
