# Changelog

All notable changes to this project will be documented in this file.

## [1.13.0] - 2026-09-22

### Added
- **The app has render tests now — 45 of them, where it had none.** There was no DOM in the test runner at all: 28 test files, 20 of them for `core/`, and not one that mounted a component. Every UI bug this project has fixed was found by opening the page.
  - **The modal shell**, which is where the placement rules live: the module's buttons belong in the footer, a tab strip belongs beside the content on a desktop and below it on a phone, each slot renders exactly once, and the bar `ModalBottomBar` portals into folds away when nothing arrives. The rules are a media query, not a class, so only a rendered tree can check them — and reverting the phone placement does fail the test that describes it.
  - **The primitives**: a button that does not fire while disabled or loading, a switch that reports the new state rather than the old, a select that shows a label and returns a value, and an icon that draws path data — including the lower-case names the app really passes (`spinner`, `x`).
  - **The schema-driven forms.** Most of this app's forms are derived from a zod schema, and which control a field gets depends on reading zod's internals. With every `instanceof` check removed, the structural fallback alone still renders all seven field kinds — which is the proof that 1.12.0 brought it back to life.
  - **A smoke test per editor**: all ten mount, on a desktop and on a phone. Two of this year's bugs were a screen that could not open at all.

### Fixed
- **Two tests were quietly breaking every test that ran after them.** `bun test` shares one global scope: the back-gesture test replaced `window` with a fake and then deleted it, and two others assigned to `localStorage`. There was nothing downstream to break before — the moment there was, 45 tests failed. Both now restore the property descriptor they found.

## [1.12.0] - 2026-09-22

### Fixed
- **Type errors are at zero, down from 141 three releases ago.** The project builds with esbuild, which does not typecheck, so everything below had been shipping quietly. Among the last 43:
  - **The dashboard's own Git Log button would have thrown.** Its hook promised a `history` field the store has never had, so it was `undefined`, and `history.length` would have crashed the dashboard on render. Nothing caught it because the button is behind an `onOpenHistory` prop no caller passes. The field now reads the active profile's history for real.
  - **A balancer's errors never reached the form.** `validateBalancer` returns plain messages; the editor folded them into a `{field: message}` record, so every key was `undefined` and the form received nothing. "Balancer tag is missing" had no way to appear at all — only the selector message did, and only in its own panel. All of them show now.
  - **The DNS server rows lied about their handlers.** They declared `onClick`/`onDelete` as taking an index while the list passes closures, so the row handed `onClick` a MouseEvent and called `onDelete` with nothing. It worked because the closures ignore their arguments; the declaration was the wrong half.
  - **Zod 4 renamed the runtime tag and the fallbacks went dead with it.** `SchemaField` recognises a field's type by `instanceof` with a structural fallback for schemas built by a second copy of zod — and that fallback read `_def.typeName`, which zod 3 wrote and zod 4 does not. Fourteen comparisons that could never be true; they read `_def.type` now.
  - Editing a reverse-proxy entry by an out-of-range index would have written a half-formed one with neither tag nor domain. A WireGuard peer error whose path segment was a symbol would have thrown while being formatted into the field name. The dashboard's JSON editor declared a `setConfig` that drops the raw text its caller passes and its store accepts.
  - The transport editor's `errors` prop was typed as a keyed map, while both the inbound and outbound editors pass an array — the code has always handled both; only the type disagreed.

## [1.11.0] - 2026-09-22

### Changed
- **Everything you tap is at the bottom of the sheet now; the top is for reading.** A phone is held one-handed and the top third of it is out of a thumb's reach, so every control that was sitting above the content moved down:
  - The six **Back** buttons in the list-to-detail editors — routing rules, DNS servers, hosts, snippets, the inspector — were the first line of the pane they opened. They are the last now, in a bar at the foot.
  - **Core settings' tabs** were a sticky row at the top of the body. They are a row of their own above the buttons.
  - The routing editor's **JSON** toggle came down with them.
  - The DNS tabs lost 2px of padding each, which is what it took for all four plus JSON to stop scrolling sideways on a 412px screen.
- These controls live deep inside panes whose state the shell cannot see, so they stay where they are in the code and render where the thumb is — one element, moved, not a second copy. The bar folds away when a sheet has nothing to put in it, and a test keeps a merely-hidden control from propping it open.

## [1.10.1] - 2026-09-22

### Changed
- **A module's own buttons sit at the foot of the sheet, not under its title.** 1.10.0 gave them a strip below the header, which put the one control you press most — JSON Mode — at the top of a phone screen, where a thumb does not reach. They share the bottom with Close and Save again. The strip cost more than it saved anyway: **132px of chrome instead of 155**, measured on the inbound editor at 412x800, where the body went from 645px to 668px.

## [1.10.0] - 2026-09-22

### Changed
- **Every editor gives its own settings more room.** The shell took 200px of a phone screen: a 73px title bar and a 127px footer stacked into two rows, one for the module's buttons and one for Close. The title bar is 41px now, the module's buttons get a full-width strip of their own under it, and the footer is a single row — **155px of chrome instead of 200**, measured on the routing editor at 412×800, where the body went from 600px to 645px.
- **One way out, not two.** A sheet had both a × in the corner and a Close at the foot. The Close stays; the × returns only when a module renders no footer to hold it.
- **Core settings fit without scrolling sideways.** Five controls came to 571px in a 391px strip. The three tabs switch what the body shows, so on a phone they moved into the body as a sticky row, leaving Export and the JSON toggle — which fit exactly.
- **The geo viewer's source picker folds.** It is half a phone screen, and once a list is loaded it stands between you and the thing you opened the viewer for. It folds itself the moment data arrives and reopens on a tap — **239px reclaimed**, measured with the search field moving from y=416 to y=177.

## [1.9.0] - 2026-09-22

### Fixed
- **Opening the Git log froze the app for two minutes.** It computed a full line diff for *every* commit in the history, on open, on the main thread — up to fifty alignments of two 200 kB configs. Measured on a 203 kB config with 30 commits: **131 seconds**. Every snapshot already carries the counts from when it was committed, so nothing needs computing; anything older falls back to a line tally, which is O(n). The same 34,860 changed lines now take **97 ms**.
  - It was not the storage. Serialising the whole persisted store with 50 snapshots measured 29 ms and writing those 16 MB to IndexedDB measured 40 ms — both fine. `diffLines` is O(N·D), and on ~7,000-line configs that is 6 ms for one changed rule, 1.2 s for sixty, and **16 s** when everything changed.
- **Every diff now has a time budget.** The commit badge and the stats line get 150 ms; the diff you are actually looking at gets 1.5 s. Past that the library bails out instead of finishing, counts still arrive from the tally, and the viewer says the change is too large to line up rather than showing nothing.

### Changed
- **The dashboard shows every routing rule.** It stopped at 20 with a "+N more" note. Desktop shows all of them and the card scrolls as it always did; a phone gets a windowed list with contained overscroll, since the section otherwise grows to the length of the whole rule set.

## [1.8.0] - 2026-09-22

### Added
- **The system Back gesture closes the sheet instead of the app.** Every editor here is full-screen on a phone, and a full-screen view that swallows Back turns "out of this" into "out of everything you were doing". One history entry per open layer; the topmost closes, and a sheet closed by its own button leaves no stray entry behind. List and detail are separate levels, so Back steps out of a rule or a DNS server before it closes the editor.

### Fixed
- **Props that did not exist, so the things they asked for never happened.** The project builds with esbuild, which does not typecheck, so none of this ever surfaced:
  - `Icon` took a `size` at eight call sites and ignored every one — those icons drew at the inherited 1em rather than the pixel size asked for. It also took a `title` that went nowhere, so three tooltips never appeared.
  - `Card` took an `action` at three call sites and dropped it: the profile toolbar in Editor Settings had not been rendering at all.
  - Four buttons asked for `variant="indigo"`, which the Button has never had, and rendered with no variant styling.
- **The link parser could crash on a malformed link.** It reads pasted VLESS/VMess/Shadowsocks links — untrusted input by definition — and indexed `split()` results without checking. A link with no scheme threw; one with no `:` in its userinfo passed `undefined` on as a method and password. All 33 of its type errors were that shape.
- The diff viewer indexed lines past the end of its array, the commit dialog read a config it is typed to accept as null, and two path-walking `update()` helpers indexed with a possibly-undefined segment.

### Changed
- Lint warnings 126 → 66 and type errors 141 → 43, with a `typecheck` script so the rest stay visible. Dead code went with them: a REALITY key generator nothing called, a schema lookup whose result was discarded, 31 catch bindings nothing read.

## [1.7.1] - 2026-09-22

### Fixed
- **The manifest link was missing from the page in at least one Android browser**, which is why the app could not be installed there — the diagnostic added in 1.7.0 named it on the first try. The build injects `<link rel="manifest">` and the deployed HTML demonstrably carries it, so something in that browser rewrites `<head>`: a content blocker, a reader mode, a translation layer. None of them say so. The app now checks for the tag at boot and puts it back when it is gone, and the diagnostic reports whether the served page had it — which distinguishes a broken build from a browser that strips it.

## [1.7.0] - 2026-09-22

### Added
- **The app says why the browser will not install it.** Chrome answers "this app cannot be installed" and volunteers nothing else — not in the dialog, not in the console. Every condition it checks is observable from the page, so Settings now runs the same checks *on the device that is refusing* and names the one that fails: HTTPS, the manifest link, its contents, whether `start_url` sits inside `scope`, whether an icon of at least 192px is declared **and actually loads**, and the state of the service worker. There is an Install button too, for when the browser has offered one.
  - This exists because the first cause was invisible from a desktop: the icons were gitignored, so the manifest shipped pointing at 404s, and each hypothesis cost a deploy to test.

### Changed
- **Modules moved into the dock.** On a phone the modules strip was an accordion at the top of the dashboard that pushed everything else down. It is a sheet raised from the dock bar now — the same nine buttons, the git status and the JSON toggle, over a backdrop, capped at 80% of the screen.
- **Cloud moved back up top**, next to the indicator that says whether you are linked to it, which is where its state was already being reported.

## [1.6.2] - 2026-09-22

### Fixed
- **Scrolling over most of the app stopped working.** 1.6.1 put `overscroll-behavior: contain` on `.custom-scroll` to keep a mobile sheet from dragging the page behind it. That mode stops scroll chaining *even when the container has nothing to scroll* — so the wheel was swallowed and the parent never moved. `.custom-scroll` is on about a hundred elements, most of them not overflowing at any moment, which turned "scroll anywhere" into "scroll only over the few panes that happen to be full". Containment now sits on the one element that wanted it: the sheet body, which is always a scroll container. Measured on the dashboard: seven `.custom-scroll` elements, none of them overflowing, exactly one containing.

## [1.6.1] - 2026-09-22

### Fixed
- **The app could not actually be installed.** `.gitignore` carries a blanket `*.png` / `*.ico` rule, so the generated icons were never committed: the deploy shipped a perfectly valid manifest pointing at files that 404'd, and Chrome answered "this app cannot be installed" with nothing in the console to say why. Nothing in a build, a type check or a test noticed — only fetching the deployed files did. There is now a test that checks every icon the manifest and the page name exists **and is not ignored by git**, and it fails when the files are removed.

### Changed
- **The dashboard is one scroll on a phone.** Four sections, each a fixed-height box with its own scrollbar, stacked inside the page scroller: four independent scroll regions in one viewport, each showing a few rows and clipping the next one mid-line. Below `md` a section grows to fit instead, the page is the only thing that scrolls, and tapping a section header folds it away to reach the one under it. Measured at 412×700: one scrollable region where there were four.
- **The verbs moved to the bottom of the screen.** The top bar was six controls of equal weight, one of them carrying a text label — so "push to cloud" took 40% of the width and the rest were squeezed into what was left. Open, Save, Cloud and About are a bottom bar now, where a thumb reaches; the top bar keeps identity, diagnostics and the drawer. The bar hides when you scroll down and returns when you scroll up, because in a browser tab the address bar is often along the same edge.

## [1.6.0] - 2026-09-22

### Added
- **The editor installs as an app.** Manifest, icons, and a service worker that precaches the shell, so it opens offline and runs in its own window without browser chrome.
  - Updates are offered, never taken. A worker that activates on its own reloads the page, and the main surface here is a text editor with unsaved work in it — so a new build waits behind a toast that does not dismiss itself, and an installed window checks hourly for one.
  - Deliberately not cached and not intercepted: the Remnawave panel, the WARP registration worker (caching that would hand every user the same keypair), the CORS proxies, the GitHub commits feed, and the geo `.dat` files — those are tens of megabytes and already cached in IndexedDB with a TTL of their own. Fonts are the one third-party request held, because without them the code editor measures the wrong character width and the caret drifts off the text.
- **Export and import everything the editor remembers.** Downloading a config exports that config alone; profiles, version history, panel connection, libraries and settings never were portable. On iOS a home-screen app gets a storage container separate from Safari's, so installing after months of work would open an empty editor with the real data still in Safari and unreachable — Settings now warns about exactly that, before the install rather than after. Import checks the file before writing anything and shows what it holds, since restoring replaces everything.

### Changed
- **The app is 2.8 MB instead of 7.5 MB.** `Icon` resolves components from strings, so the whole icon set was imported — about 1,500 icons, 5 MB of the bundle, for the 143 this app draws — and a namespace import is the one shape a bundler cannot tree-shake. Icons are now rendered once at build time and shipped as path data: 240 kB raw, 53 kB over the wire, generated by `bun run icons:generate` with a test that fails while the checked-in file is stale.
  - Vendor code is split by module path, so a deploy no longer re-downloads React, CodeMirror, the topology renderer and the icons along with the change.
  - Workbox drops anything over 2 MiB from the precache *by default* and says nothing about it; the limit is raised explicitly, or offline would simply not work.
- The deploy workflow fetches tags, so the version shown in the app is the tag that triggered the build instead of a fallback.

### Fixed
- **Scrolling in the routing rule list.** It was 16px tall behind an `overflow-hidden`, so there was nothing to scroll. Measured at 412×700 with 20 rules: 322px of viewport over 1215px of content, reaching the bottom.
- Nested scrollers contain their overscroll — reaching the end of a list handed the gesture to the page behind the sheet, which read as the whole modal lurching.
- **`Select` only ever clamped its dropdown's right edge, never the bottom**, so a select low on the screen — or any select at all with a keyboard up — opened its list off-screen. It measures against `visualViewport`, which is what actually shrinks for a keyboard, and opens upward when there is more room there.
- **Pinch zoom works again.** Inputs are 16px on a phone, which is what stops iOS zooming in on focus — the only thing `user-scalable=no` was there to prevent, at the cost of taking zoom away from everyone who needs it.
- `viewport-fit=cover` with the insets paid back in the app shell and the sheet's header and footer, so a full-screen editor stops sitting under the notch and the gesture bar.

## [1.5.0] - 2026-09-22

### Fixed
- **Editors no longer collapse to a strip on a phone.** `Modal` emitted `h-auto` while every caller passed its own `h-[90vh] md:h-[88vh]`. Both are plain classes, so stylesheet order decided the winner — and below `md` that was `h-auto`. The box then sized to its content, every `flex-1 min-h-0` beneath it resolved against an indefinite height, and what was left was the chrome that happens to be `shrink-0`, with `overflow-hidden` leaving nothing to scroll to the rest. Measured on a 412×380 viewport: the routing editor's panel was **644px tall inside a 380px screen**, with 16px of it reachable.
  - Height now belongs to the shell. A phone gets a full-screen sheet (`100dvh`, square corners, no backdrop gutter); callers keep only their desktop height, breakpoint-scoped so it cannot apply on a phone. At 412×700 the rule list went from 265px to 321px and the panel stops overflowing the screen at any height.
  - `dvh` instead of `vh` throughout the modals: `vh` is the *large* viewport and ignores both the browser's collapsing toolbar and the keyboard, which is why the footer kept ending up under them.
  - Below `md` the modal body always scrolls, whatever the caller asked for. That is the fallback that keeps content reachable when an inner flex chain misbehaves, instead of hiding it.
  - The tab strip sits above the action row instead of below it, so Close and Save stay where a thumb is.
- **`hide-scrollbar` / `no-scrollbar` were never defined.** Six places used them to make a horizontal tab strip scroll cleanly; without the rule the scrollbar took height on desktop and the strip just looked clipped.
- `min-h-[600px]` on the config inspector and `h-[80vh]` panes inside the inspector and geo viewer now fill the shell instead of re-deriving a height taller than the phone they are on.
- **Controls that could not be reached on a touch screen.** Four delete buttons were `opacity-0 group-hover:opacity-100` with no `md:` prefix — removing a DNS server, a WireGuard peer, a commit or a snippet field was not merely subtle on a phone, it was impossible. The house idiom scopes the reveal to desktop; these are the places that missed it.
- **The config inspector had no mobile layout at all** — a rigid 320px index beside the board left about 25px for the board. It shows one pane at a time now, with a back button, the same switch the DNS and balancer editors already use. The geo viewer got the same back affordance, since opening a tag there already collapsed the list to nothing.
- **The JSON editor never wrapped lines**, so every long value sat behind a horizontal scroll past a 45px gutter. Narrow viewports wrap now, through a CodeMirror compartment, so a rotated phone changes its mind instead of keeping whatever was true at startup.
- **Twelve grids declared two or three columns with no breakpoint**, and `col-span-2` inside a one-column grid spanned into an *implicit* second column — measured at 412px, a `grid-cols-1 md:grid-cols-2` row resolved to `294px 0px` and `39px 221px`. A sweep of every grid on screen at 412px now finds only the two deliberate two-up button rows.
- **Tap targets.** Sweeping the rendered page at 412px found them: number and duration steppers 14px tall inside a 34px rail, settings and routing tabs at 22–28px, and every `?` hint a 14×14 target — the control that explains a field was the hardest thing on the page to hit. Touch gets 20px arrows in a 40px rail, 40px tabs, and a 34×34 hit area around each `?` (grown with a pseudo-element, so nothing moves). Desktop keeps the compact ones.
- **Heights chosen for a laptop.** `h-[500px]` panes in the DNS, reverse and tag-details editors, plus 280–380px textareas and three 400px dashboard cards, did not fit a ~700px phone and did not shrink to say so. They fill the sheet on a phone and keep their designed height from `md` up. The topology legend is capped at a third of the screen instead of covering half the graph.
- A boolean field's label and its switch stack instead of squeezing each other, and a long label no longer pushes its `?` out of reach.

## [1.4.2] - 2026-09-22

### Added
- **A list of real paths from the target, for spiderX to draw on.** The generator can only produce paths that *look* real; the target's own paths are the ones that will not 404, and they are always a paste away. General Settings now takes a sitemap, a HAR export, a page's HTML, or a plain list of paths, and reads the paths out of whatever it is given — no need to say which. With a list stored, the spiderX dice draws from it instead of inventing anything, and says so.
  - Absolute URLs from other hosts are dropped. A paste always carries an XML namespace, an analytics beacon or a font CDN, and their paths exist on someone else's server — keeping them would fill the list with guaranteed 404s. The site is whichever host appears most.
  - Query strings and fragments are dropped, trailing slashes and duplicates collapse, and non-ASCII paths are percent-encoded once. Parsing the same text twice adds nothing the second time.
  - The list is stored per browser and survives a reload; paths can be removed one at a time or all at once.

## [1.4.1] - 2026-09-21

### Changed
- **spiderX generates a path a browser would actually request.** It used to emit `/xzga` — a slash and four random letters, which is the one shape no real site serves. The dice now builds pages (`/docs/getting-started`, `/blog/2024/06/release-notes`), build assets (`/static/js/runtime.5bf2f13f.js`, `/assets/css/main.min.css`) and API calls (`/api/v2/users/me`), weighted towards what a browser spends most of its requests on. Clicking twice never hands back the value already in the field.
  - No query strings. xray-core parses spiderX as a URL and reads the spider's own tuning ranges out of its query, so a decorative `?q=...` is not decoration — it would be consumed as configuration.
  - The hint on the field now says what spiderX actually is — the path the client requests on the target site after the handshake — and that a path the target really serves beats a generated one, because nothing in here can know what the target has.

## [1.4.0] - 2026-09-21

### Changed
- **The DNS card shows the DNS block, not a count of it.** It used to display a server count, a host count, a strategy, and a `clientIp` that read "N/A" in every config anyone has — four numbers you cannot act on. It now shows the upstream resolvers themselves, how many are scoped to a domain list (which is what makes DNS split), static hosts, FakeDNS pools, and whether a routing rule actually sends queries to the dns outbound.
  - It also names the things that look configured and do nothing: a DNS block with no upstreams, a `dns` outbound no rule routes to, FakeDNS pools no inbound sniffs for, and `UseIPv6` when every upstream is reached over IPv4. Those are silent no-ops, which is exactly why they are worth saying out loud.
  - `clientIp` appears only when it is set, labelled ECS, since that is what it is for.
- **The shortId batch control is a normal-sized control** instead of a 10px button wedged between a label and a number box.

### Added
- **spiderX generates from its own field**, with a dice like `shortId` and `privateKey` already had — so it is there wherever spiderX renders, including a server inbound that already carries one. The separate "Gen SpiderX Path" button above the form is gone; it only ever appeared for clients.

### Fixed
- **`password` in a REALITY client had no label and no explanation.** It is the server's public key — newer xray-core renamed the field from `publicKey` — and a field called "password" sitting in a VLESS form with no hint invites people to invent one. Both spellings are now labelled "Server Public Key", each saying it is the same field under two names and that only one should be set. Same treatment `target`/`dest` got in 1.3.1.

## [1.3.1] - 2026-09-21

### Fixed
- **A field already in your config is never hidden.** 1.3.0 split the TLS and REALITY forms by side, which was right for an empty form and wrong for an existing one: panels write client keys such as `fingerprint` and `spiderX` into server inbounds, and hiding a key that is *in the data* left it invisible, unremovable, and still written back on every save. Those fields now appear whenever they hold a value, with a note saying which side's core will actually read them — so a value copied in by mistake can be seen and cleared instead of quietly riding along.
- **`target` had no label and no hint**, so it rendered bare next to `dest`, its own older alias, with no way to tell what either was for. Both are labelled now and both say they are the same field and that only one should be set.

## [1.3.0] - 2026-09-21

### Added
- **One factory for inbounds and outbounds.** They were built by two functions with two switch statements, so the two sides of a protocol drifted apart unnoticed — the outbound learned `vnext` while the inbound kept `clients`, and only one of them ever got a new default. `createEndpoint(direction, protocol, options)` describes each protocol once with a builder per side, so a gap shows up in the source instead of in a config someone is debugging. `createDefaultInbound` / `createDefaultOutbound` remain as direction-bound wrappers.
  - The same options build both ends: passing one `uuid` gives a server and a client that can actually talk to each other, which is what building a client config from a panel host needs.
  - `protocolsFor(direction)`, `supportsProtocol()` and `bidirectionalProtocols()` replace the hardcoded protocol lists.
  - Fixed on the way through: a generated VLESS outbound carried `security: 'auto'`, which is a VMess field and does nothing in VLESS. It now carries `encryption: 'none'`.
- **Every outbound says how traffic reaches it, and at which layer.** Each card now shows whether a rule names it directly or a balancer selects it, how many rules reach it, and whether those rules decide at the transport layer (addresses and ports, always available) or the application layer (domains and protocols, which only exist once the inbound has sniffed the traffic). An L7 rule on an inbound with sniffing off matches nothing, and nothing used to say so.
  - Outbounds that no rule can reach are marked, as is the first outbound, which quietly receives everything unmatched.
  - Balancer selectors are matched by prefix, as the core does, so a selector of `proxy` correctly claims `proxy-2`.
- **Batch editing for inbounds and outbounds.** Transport, security layer, tag prefix and suffix, sniffing and port renumbering with a step for inbounds, Mux and dialer chaining for outbounds, plus arbitrary dotted paths.
  - Every batch shows exactly what it will change, field by field as `before → after`, and what it will refuse and why, before anything is written. Setting a transport on a WireGuard outbound or a port on a TUN inbound is skipped with a reason rather than written and discovered when the core will not start.
  - An outbound asked to chain through itself is refused: the core will not run a dialer loop.
  - Reachable from the Inbounds card and from the Outbounds multi-select, which now offers Edit alongside Delete.
- **shortIds are generated in batches.** A count next to the REALITY key tools generates that many at once, all distinct and distinct from the ids already in the list.

### Fixed
- **The shortId dice button replaced the whole list with three fresh ids**, discarding shortIds that clients in the field were already handshaking with. It appends one now.
- **The client UUID is no longer asked for when building a panel template.** A template has no single subscriber — the panel substitutes each one's own credentials when it renders the subscription — so the field only appears for a client config, which really does belong to one person.
- **Schema drift against Xray-core, found by a new audit** (`bun run schema:audit`, which compares the zod schemas the forms are built from against the types generated from the core's own `infra/conf`):
  - `clients` was missing from the VLESS, VMess, Trojan and Shadowsocks inbound schemas — the field every server config is written with, and the one this app itself emits.
  - `vnext` / `servers` were missing from the matching outbound schemas, likewise.
  - REALITY was missing `masterKeyLog` and `type`; `masterKeyLog` was nonetheless referenced by the form's exclude lists, so the Extended section tested a field the form could never render.
  - Also added: VLESS inbound `flow`, VLESS outbound `email` and `seed`, VMess outbound `email`, Trojan outbound `flow`.
- **Several TLS fields could not be set anywhere in the UI.** `certificates`, `verifyPeerCertByName`, `curvePreferences`, `echConfigList`, `echServerKeys` and `echSockopt` were excluded from the basic form and from the Extended section both, leaving raw JSON as the only way to reach them.

### Changed
- **Which security fields belong to which side is declared once**, in `core/xray/field-directions`, instead of in five hand-written `excludeKeys` arrays that nothing checked against the schema. A field added to the schema used to appear on both sides; a field removed from it left a stale entry behind. A test now fails if any schema key has no declared direction, or if a declared field is reachable from no form at all.

## [1.2.0] - 2026-09-14

### Added
- **Snippets are edited as forms, not just as JSON.** A snippet body is an array of the very objects the routing editor already edits, so it now gets those same editors instead of a second set: rules open in the rule editor, balancers in the balancer editor, and an outbound opens the outbound editor as a secondary modal. A **Form / JSON** switch sits above the body, matching the rest of the app.
  - Editing a rule inside a snippet and editing one in Routing are the same screen, with the same matchers, geo lookups and duplicate warnings — nothing to learn twice.
  - Tag suggestions come from the config currently open. A snippet has no config of its own, so the open one is the closest thing to the context it will be spliced into.
  - A new snippet starts empty and therefore has no kind yet, so the form asks what you are building — routing rules, outbounds or balancers — and creates the first entry. Sending someone to raw JSON to write their first rule is exactly the case a form should cover.
  - A body with two kinds of entry in it has no single editor to show, so mixed and unrecognised bodies stay on JSON.

### Fixed
- The generated-body block could overflow the snippet editor and cover its save buttons: a fixed-height box inside a flex column was being squeezed rather than scrolled.
- The kind badge and the "this body looks like …" warning were English-only, and the local library's empty state was never translated.

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
