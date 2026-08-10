# Changelog

All notable changes to this project will be documented in this file.

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
