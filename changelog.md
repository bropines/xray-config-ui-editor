# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2026-09-14

### Added
- **A "?" hint on every balancer field.** Tag prefix, balancer tag, tag style, strategy, fallback, max RTT, expected nodes, probe kind, interval, timeout, samples kept and probe URL now each explain what they do and what going too far in either direction costs you — the column had no room left for more inline text, which is what a tooltip is for. `Input` and `Select` grew the same `help` prop `FormField` already had, so this is available to every form in the app.

### Fixed
- **The generated JSON was cut off with no way to scroll to it.** The builder's right column had three nested scroll areas — the column itself was `overflow-visible` on desktop while the options grid scrolled inside a 38vh box — so the preview below simply grew past the modal and was clipped. One scroll container now, with the preview a fixed-height block inside it.
- **Russian text mixed into English sentences.** "These domains get a routing rule straight to напрямую" and similar: the translation pass had wrapped single words that sat inside a longer sentence, splitting what should have been one translatable string. Those sentences are whole again.
- Another 22 strings were hiding in template literals — import counts, delete confirmations, the git log header, duplicate-matcher warnings — where a scan for quoted text could not see them. They are translated, with proper Russian plurals for the counts.

## [1.1.1] - 2026-09-14

### Fixed
- **Opening a routing rule crashed the app** (`t is not a function`). The rule editor built its target dropdown with `outboundTags.map((t: string) => …)`, and that `t` shadowed the translate function, so calling it called a string instead. Every local binding named `t` is renamed, and a test now fails if a file both calls `t()` and shadows it — TypeScript cannot catch this, since a string genuinely is what `t` holds inside that callback.
- **Four icons rendered as a red "?"** — `FileSearch`, `FileJson`, `NoEntry` and `Server` are not names this icon set exports. `Icon` resolves its component from a string, so a wrong name fails silently at runtime; a test now checks every literal icon name against the icon set.
- **Cyrillic changed font mid-line in the code editor.** JetBrains Mono's Cyrillic subset only downloads when a Cyrillic glyph is first painted, and CodeMirror measures one character's width at startup to build its cursor and selection geometry — so Cyrillic arrived after the measurement, rendered in a fallback at a different width, and pushed the caret off the text. The Cyrillic subsets are now warmed at boot, and the editor re-measures once fonts settle. The font request was also duplicated in `index.html` (once with `display=block`, once with `swap`), which doubled every `@font-face`.
- `font-mono` fell through to Tailwind's default stack while the editor forced JetBrains Mono, so a mono input and the editor beside it rendered in two different fonts. Both stacks are now named once in the theme, ending in faces that actually carry Cyrillic.

### Changed
- **Field hints are real tooltips instead of the browser's native `title`.** They match the rest of the UI, appear without the native half-second delay, respond to keyboard focus, and flip above or below the icon depending on the room available. Tapping the icon toggles the hint, which is the only way to read one on a phone.
- **The language picker is a dropdown.** The EN/RU pair only stayed readable for exactly two languages and spent header width on the option you were not using.

## [1.1.0] - 2026-09-14

### Added
- **The interface speaks Russian.** All 1390 user-visible strings — labels, help text, placeholders, toasts, validation messages, empty states, even the screen-reader instructions for drag-and-drop lists — switch from the **EN / RU** control in the header. The first visit follows the browser's language; after that the choice is remembered.
  - Xray's own vocabulary (inbound, outbound, sniffing, REALITY, sockopt) and config enum values (`AsIs`, `UseIP`, `leastPing`, cipher names) stay in English on purpose: translating a dropdown option would stop it matching what the JSON says. Those are listed explicitly in `src/i18n/untranslated.ts`, so each one is a decision rather than an omission.
  - Russian plurals are handled properly — "1 конфиг / 2 конфига / 5 конфигов", including the 11–14 exceptions — rather than the usual "1 конфиг(ов)".
  - A missing translation falls back to English, so an incomplete dictionary can never break a screen. `bun test` asserts that every rendered string is either translated or explicitly exempt, and `bun run i18n:report` prints what is missing or stale.
- **"What is this" guides in the Remnawave modules.** Hosts, Templates and Snippets each open with a short explainer showing where that module sits in the chain a config actually travels — config profile → inbound → host → XRAY JSON template → subscriber — with its own link highlighted, plus the two or three things that are easy to get wrong. Collapsible, and remembered once closed.
  - Hosts: what binding to an inbound decides, and that attaching a template is the only way a balancer reaches a subscriber.
  - Templates: that a template carries no nodes of its own, and that saving it to the panel is not the same as publishing it.
  - Snippets: that the panel expands the reference before a node ever sees the config, so editing a body changes every profile that uses it.

### Fixed
- `Modal` rendered its default Save and Close labels through a helper it never imported. Types and the production build both accepted it; every modal would have thrown on open. A test now checks that every file calling `t()` imports it, since neither `tsc` nor the bundler can.
- The document's `lang` attribute now matches the active language from the first paint, instead of always claiming English.

## [1.0.26] - 2026-09-14

### Fixed
- **Toolbar alignment**: only the Remnawave group carried a visible label, so it started one line lower than the Core buttons and the whole row looked off-centre. Both groups are labelled now and the row is top-aligned, so the labels share a baseline and the buttons line up. On desktop those labels are the headings — the separate "Modules" title only appears on mobile, where it carries the collapse control.

## [1.0.25] - 2026-09-14

### Changed
- **Templates moved inside the Local Balancer instead of being a module of their own.** A panel template is what the builder writes, so they were two screens for one object with nothing on either explaining the relationship. In panel-template mode the builder's left column is now the template list — the node list there was meaningless anyway, since the panel injects hosts when it renders a template — and the right side gained the **Form / JSON** switch this app already uses for routing rules, inbounds and outbounds.
  - Form and JSON are two views of the same template: switching to JSON shows exactly what a save would write, and switching back reads the text into the fields, reporting anything the form cannot represent rather than dropping it.
  - Selecting a template loads it into the form and makes it the save target in one step; duplicate and delete sit under the list.
  - The Templates button now opens the builder in template mode rather than a second editor.
- **The module row is split into Core and Remnawave.** Core covers what edits the config open in the editor (settings, reverse proxy, topology, geo viewer, inspector, local balancer); Remnawave covers what reads or writes the panel (hosts, templates, snippets). Nine unlabelled buttons in a row gave no clue which of them touched someone's live panel.

### Fixed
- `tweetnacl`'s local type declaration was missing `scalarMult`, so the REALITY public-key derivation added in 1.0.20 type-checked only by accident.

## [1.0.24] - 2026-09-14

### Added
- **Hosts editor** (`Core Modules -> Hosts`): edit the panel's hosts in this app instead of switching to the panel for it. Remark, address and port, tag, the inbound it serves, the Xray JSON template it renders, the transport details (security layer, SNI, Host header, path, fingerprint, ALPN, allow-insecure) and the hidden/disabled switches. Create and delete are in the same screen.
  - **Saving sends only what changed.** A PATCH built from the difference against the loaded host, so settings this form does not show — squad assignments, mappers, per-node overrides — keep whatever the panel has. The editor states which fields a save will send before you press it.
  - Cleared optional fields travel as an explicit `null`, so clearing an SNI actually clears it.
- The panel host list in the Local Balancer builder has a pencil on each row that opens that host in the editor.

### Changed
- Selecting hosts in the builder no longer looks like it requires a client UUID: that field is labelled and explained as what it is — needed only by **Add**, which mirrors hosts into client outbounds. Editing a host needs no UUID at all.

## [1.0.23] - 2026-09-14

### Changed
- **DNS defaults now live in one place.** `1.1.1.1 / 8.8.8.8 / UseIP` was written out separately in the WARP presets, the store's `initDns`, the local-balancer defaults and the dns-outbound factory — four copies of the same decision with nothing marking which was authoritative. `src/core/presets/dns.ts` now holds the resolver presets, the default upstream, the query strategy and the single `createDefaultDns()` factory those four call.
- **Bypass lists became a registry.** `BYPASS_LISTS` in `src/core/presets/bypass-domains.ts` carries each list's id, label, description and domains, and the builder renders a switch per entry — adding a list is one entry, not a new toggle plus new state plus a new parser branch. `splitBypassDomains`/`composeBypassDomains` are the round-trip used when loading someone's existing config.
- **The bypass section says what it does.** It is now titled "What stays off the tunnel" and states that the same list is written into both the routing rule and the DNS block, which is the part that was easy to miss when the two were configured in separate boxes.

### Added
- **Your own bypass domains are editable.** Domains outside the curated lists were preserved when loading a config but had nowhere to be typed; there is now a field for them, and the hint points out that `geosite:` categories work there — a list maintained upstream rather than shipped in this app.
- **Resolver presets** (Cloudflare, Google, Quad9, AdGuard, system) as one-click choices, in the builder's DNS section and in the DNS editor's server list, so the two screens no longer disagree about what the usual DNS is.

## [1.0.22] - 2026-09-14

### Added
- **Subscription Templates editor** (`Core Modules -> Templates`): the free-form counterpart to the Local Balancer builder. Lists every template the panel holds, opens any of them as text, and saves it back. JSON templates are edited as JSON with a live parse check; the YAML kinds (Clash, Stash, Mihomo, Singbox) are stored base64 in the panel and are decoded here — emoji included — then re-encoded on save. Create, rename, duplicate and delete are all in the same screen.
  - A template that looks like a balancer offers **Edit in Local Balancer**, which opens it in the builder with its settings already in the form fields.

### Fixed
- **The builder lost the template it had just created.** `saveSubscriptionTemplate` returned a boolean, so after "Save to panel" the new template's uuid was dropped: "Create entry host" stayed disabled telling the user to save a template they had saved, and clicking save again created a second template with the same name. It now returns the uuid, selects it, and refuses a second concurrent save.
- **Whole panes were unreachable on a phone.** In the Local Balancer builder and the Snippets library the second column collapsed to zero height on a narrow screen, taking every option, the preview and — in Snippets — every save button with it. Both now show one pane at a time with a switch, the way the Routing Manager already did.
- **Balancer list actions were invisible on touch**: the delete button used `opacity-0 group-hover:opacity-100` with no mobile fallback, so it could never be tapped. Long balancer tags also pushed the row off screen.
- **Footer buttons wrapped instead of scrolling**, doubling the modal footer's height on a phone.
- Core Modules buttons now lay out as a two-column grid on mobile instead of wrapping raggedly, and the outbound rows give the tag back the space the decorative index took.
- **A snippet body with a JSON syntax error could be "saved"**: the editor only propagates parsed values, so the stale body was pushed to the panel with a success toast. Saving is now blocked while the text does not parse, and the button says why.

### Changed
- Destructive or wide-reaching panel actions now arm before they fire, each stating its consequence: hiding and re-tagging node hosts, emptying a panel snippet, and syncing a snippet (which restarts nodes).
- The publish flow in template mode is numbered (save the template, then publish it) and lists what is still missing before the entry host can be created, instead of reporting one missing field per click.
- Wording pass on the terms that were panel jargon: shared tag rather than pool tag, entry host described as the one subscribers see, "insert a detached copy", "samples kept", and empty states that name the next action.

## [1.0.21] - 2026-09-14

### Added
- **Create panel hosts from the app.** The builder can now finish the job it used to hand back as a JSON file: mark the selected panel hosts as the hidden pool behind one tag, then create the visible entry host bound to a config-profile inbound with the Xray JSON template attached. That is the whole chain — nodes as hidden hosts sharing a tag, one visible host carrying the same tag plus the template, subscribers getting the balanced config — done from the browser.
  - Tags are normalised to what the panel accepts (uppercase letters, digits, `_`, `:`) and sent as both `tag` and `tags`, since panel versions differ on which one they read.
- **Open an existing balancer and edit it.** `parseLocalBalancer()` reads a template or client config back into the builder's controls: tag prefix, balancer tag and strategy, fallback, probe, local ports, bypass lists, DNS, and the injector block. Load a template from the panel, change a field, save it back — no retyping, and no risk of the balancer selector, the probe selector and the injector prefix drifting apart.
  - Bypass domains that belong to neither preset list are preserved as a custom set rather than dropped.
  - Anything that cannot be represented is reported instead of silently defaulted — a template routing to a single outbound rather than a balancer, DNS entries the builder does not write, inbounds other than SOCKS/HTTP.
  - Round-trips cleanly against real panel templates; the two that do not are reported with the reason.

## [1.0.20] - 2026-09-13

### Added
- **Build a balancer out of the nodes already in your panel.** The Local Balancer Builder gained a second source: it reads the panel's hosts (`GET /api/hosts`) together with the inbounds they point at, and mirrors each one into a client outbound — address, port and SNI from the host, transport from the inbound, and the REALITY **public key derived from the inbound's private key** (X25519 base point), so nothing has to be copied by hand. Hosts that cannot be mirrored (Shadowsocks, a missing key) are listed with the reason instead of being hidden.
- **Panel template output — the way a panel actually hands this to subscribers.** Switch the builder to *Panel template* and it emits a Remnawave `XRAY_JSON` subscription template: same routing, balancer, probe and bypass, but with no proxy outbounds and a `remnawave.injectHosts` block instead. The panel fills the nodes in per subscriber and tags them with the prefix the balancer selects on. Save it straight to the panel (create a new template or update an existing one), then point a host at it.
  - Host selection supports every selector the panel understands: same tag as the shown host, a tag/remark pattern, or an explicit list of hosts (fillable from the picker selection).
  - Verified field for field against a balancer template already running in a production panel.
- `publicKeyFromPrivateKey()` in `src/core/generators/crypto.ts` — the X25519 derivation `xray x25519` performs, needed to turn a server inbound into a client outbound.

## [1.0.19] - 2026-09-13

### Added
- **Local Balancer Builder** (`Core Modules -> Local Balancer`, also on the welcome screen): builds the client config people otherwise hand-write — local SOCKS/HTTP inbounds, several proxy outbounds, a balancer that picks the fastest of them, a probe that measures them, and a bypass list that keeps local traffic off the tunnel.
  - Input is forgiving: `vless://` / `vmess://` / `ss://` / `trojan://` links, a base64 subscription, a JSON subscription, or the outbounds already open in the editor.
  - **One config per location**: nodes are grouped by label with trailing numbering ignored, so a subscription of "… #1 / … #2" becomes one balanced config per place — the array shape a JSON subscription is served in.
  - Two presets: **Simple** (`proxy` / `proxy-2`, one balancer, 10s burst probe) and **Fleet** (`fb-0` / `fb-1`, fallback to the first node, leastLoad baselines, 60s probe) — or set every field by hand.
  - The parts that have to agree are derived, not typed: proxy tag prefix, balancer `selector`, probe `subjectSelector`, the catch-all rule's `balancerTag`, and the bypass list that has to appear in both `routing.rules` and the DNS entry.
  - A single node deliberately produces no balancer and no probe — traffic falls through to the first outbound instead of carrying moving parts that have nothing to choose between.
  - Output can be loaded straight into the editor, saved as local profiles, downloaded, or copied.
- **Bypass domain presets** (`src/core/presets/bypass-domains.ts`): Russian services and IP/DNS-leak checkers as two separately switchable lists.

### Fixed
- **`createProfile` attached the wrong raw text**: a profile created from a supplied config inherited the *currently open* config's `rawConfigText`, and since `switchProfile` (and every CRUD action) prefers that text, opening the new profile silently restored the old config.
- **Routing card said "match all" for rules that match something**: the dashboard summary ignored `network`, `source`, `user` and `attrs`, so the usual catch-all-by-network rule (`network: "tcp,udp"` into a balancer) was labelled as having no conditions at all.

## [1.0.18] - 2026-09-13

### Added
- **Remnawave Snippets & Local Templates**:
  - A config imported from Remnawave keeps its `{ "snippet": "NAME" }` references instead of showing them as empty, "will crash Xray" rules. References are recognised in `routing.rules`, `routing.balancers` and `outbounds` (`src/core/snippets`), rendered with their own style in the Routing Manager (rules and balancers), the Routing/Outbounds dashboard cards and the Topology graph, and skipped by rule/outbound/balancer validation.
  - New **Snippets & Templates** module (Core Modules -> Snippets): browse the panel's snippet library (`GET /api/snippets`), read what each reference expands to, and create, edit, delete or sync snippets in the panel (`POST`/`PATCH`/`DELETE /api/snippets`, `POST /api/snippets/actions/sync`).
  - **Local templates**: the same reusable blocks stored in the browser, for configs that have no panel behind them. Capture the current routing rules into a template, push a template to the panel, or copy a panel snippet down to a local one.
  - Insert a snippet into the open config either as a **reference** (stays managed by the panel) or as an **inline copy** (one-off, link intentionally dropped, behind a confirm).
  - Selecting a reference in the Routing Manager opens a dedicated pane showing its resolved body, with an autocompleted field for pointing it at a different snippet.
  - Panel snippets are fetched automatically on connect and on profile load, and cached (with local templates) in IndexedDB so an imported profile stays readable offline.

### Fixed
- **Snippet-aware diagnostics**: a rule targeting an outbound or balancer that only exists inside a snippet is no longer reported as a dangling target, and an unresolved reference is surfaced as a warning (never critical, so it cannot block a cloud push).
- **Cloud push blocked by balancer snippets**: a `{ "snippet": "NAME" }` entry in `routing.balancers` was validated as a balancer with no tag and no selector, which made `saveToRemnawave` refuse to push the profile at all.
- **REALITY inbound false critical**: diagnostics required the legacy `dest` field, so every inbound using the current `target` spelling (what Xray-core and Remnawave write today) reported "REALITY Inbound requires dest and privateKey" — and that critical blocked the cloud push. Both spellings are now accepted.

## [1.0.17] - 2026-09-08

### Fixed
- **Inbound & Outbound Protocol Selector Dropdown**:
  - Fixed an issue in `SchemaField` where `ZodUnion` schemas containing both `ZodEnum` and `ZodString` (such as `protocol: z.union([InboundProtocolSchema, z.string()])`) degraded to plain text inputs.
  - Enhanced `getSchemaTypeAndDetails` to extract and prioritize enum options and literal values from union members.
  - Explicitly passed `InboundProtocolSchema.options` and `OutboundProtocolSchema.options` in `InboundGeneral` and `OutboundGeneral` for full protocol dropdown selection.
  - Added unit test suite covering `getSchemaTypeAndDetails` with union and enum schemas.

## [1.0.16] - 2026-09-01

### Fixed
- **Cloudflare WARP Generator Resilience & Endpoints Cleanup**:
  - Removed deprecated and blocked 3rd-party WARP registration endpoints (`warp-vercel-murex`, `warp-vercel-chi`, `warp.sub-aggregator`, `warp-generator.workers.dev`).
  - Set `xcui.bropines.workers.dev` as the default reliable registration worker.
  - Implemented automatic retry mechanism with exponential backoff for handling Cloudflare API rate limits (Error 1015 / HTTP 429).
  - Improved user-facing error messages in WireGuard and WARP generation wizards.


### Added
- **Prefix-Aware Outbound Selector in Observatory & Burst Observatory**:
  - Reusable `OutboundSelector` component with full prefix matching (`subjectSelector` / `selector`), visual exact vs prefix match indicators (`GitMerge`), and real-time pending match highlighting (`Eye`).
  - Integrated `OutboundSelector` into **ObservatoryEditor** and **BurstObservatoryEditor** in General Settings.
  - Refactored **BalancerEditor** to use the shared `OutboundSelector` component for unified node and prefix selection UX across routing and settings.
  - Added unit test suite covering prefix, exact, and pending match evaluation logic.

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
