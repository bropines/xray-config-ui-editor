# Roadmap — remaining work

Written 2026-08-26 for whoever picks this up next (human or AI), after a session that
took the project from "UI and store logic tangled together" to "`ui/**` is verifiably
independent of the store, all editors use one of two established binding patterns,
Tailwind/ESLint are real build-time tooling instead of a runtime CDN script, and a
real comment-preservation bug is fixed." That work landed on branch
`fix/plan-phase-0-1-2` (9 commits, not yet merged to `main`, not pushed). This file is
what's left. Read the whole "Context" section before touching anything — two of the
open items look like obvious wins and are actually traps (see 3.1 and the immer note).

## 0. How to verify any change here

Run all four after every change, not just at the end:

```bash
bunx tsc --noEmit -p tsconfig.json   # compare error count/messages to before, not to zero
bun run lint                          # must exit 0 (warnings OK, see eslint.config.js comments)
bun test                              # 37/37 as of this writing
bun run build
```

The project has ~80 pre-existing `tsc` errors unrelated to any of this (dead code from
before this session, e.g. `link-parser.ts`, `TransportSettings.tsx`'s error-parsing
loop). Take a baseline (`bunx tsc --noEmit ... > baseline.txt`) before you start, diff
against it after — a change that fixes some and adds zero is fine; adding any new one
attributable to your own edit is not.

## 1. Context: what exists now and why

### 1.1 The two field-binding patterns — use the right one, don't invent a third

**Pattern A — `useField`/`useArrayField`** (`src/hooks/useField.ts`). For editors whose
`onChange` is a path-addressed `updateField(path, value)` (from `useXrayEditor.ts` and
its wrappers `useInboundEditor`/`useOutboundEditor`). A leaf field:

```ts
const password = useField<string>(local, updateField, ['settings', 'password']);
// JSX: <Input value={password.value} onChange={e => password.onChange(e.target.value)} />
```

An array-of-objects field (clients, peers, accounts):

```ts
const clients = useArrayField<Client>(local, updateField, ['settings', 'clients']);
clients.items.map((c, i) => ...);
clients.add(newClient); clients.update(i, patch); clients.remove(i); clients.move(from, to);
```

Reference implementation: `src/components/editors/inbound/InboundClients.tsx`. Used in
9 files total (`grep -rl "useField\b\|useArrayField\b" src/components --include="*.tsx"`).

**Pattern B — dedicated logic hook** (`src/hooks/useRuleEditor.ts` +
`src/components/editors/routing/RuleEditor.tsx`). For editors whose `onChange` takes a
*whole replacement object*, not a path (routing rules, balancers, the WireGuard
generator, Finalmask/Sockopt/Xhttp transport sub-editors, the config dashboard, the
config inspector, app nav). Pull every non-JSX concern — derived state, validation,
`useConfigStore` access, event handlers — into a hook; leave the component as
composition only. Existing hooks built this session, all following the same shape:
`useConfigDashboardLogic.ts`, `useAppNavLogic.ts`, `useConfigInspector.ts`,
`useDnsHostsEditor.ts`, `useFinalmaskEditor.ts`, `useSockoptEditor.ts`,
`useXhttpSettingsEditor.ts`, `useWarpGenerator.ts`.

**Pre-existing, separate mechanism — `SchemaForm`/`SchemaField`**
(`src/components/ui/SchemaForm.tsx`, `SchemaField.tsx`). Takes a Zod schema and
*auto-generates* inputs from its shape (string→text input, boolean→switch, enum→select).
This is genuinely schema-driven UI generation, unlike A/B above which are manual JSX
with automated *binding*. Used in 15 files (`grep -rl "<SchemaForm" src/components`).
`fieldConfigs={{ fieldName: { label, help, placeholder, options } }}` overrides the
generic label/help; unhandled fields fall back to the schema's `.describe()`. Fields
excluded via `excludeKeys` are expected to be hand-written elsewhere in the same file
(see `RuleEditor.tsx`'s `domain`/`ip`/`network` handling via `SmartTagInput`/`TagSelector`).

Don't build a fourth pattern. If a file doesn't cleanly fit A or B, say so and leave it
alone rather than forcing a fit — see the "explicitly skipped" list in commit `0abaf4f`
for real examples of "already clean, nothing to extract."

### 1.2 THE TRAP: don't switch `configStore.ts`'s CRUD actions to `immer.produce()`

This looks like an obvious win (avoid re-parsing the whole JSONC document on every
`addItem`/`updateItem`/etc. call) and **is not safe as currently understood**. Verified
empirically this session (script + results documented in commit `6a7a0f8` and
`src/utils/jsonc.test.ts`):

- `comment-json` (the JSONC parser, `src/utils/jsonc.ts`) attaches comment metadata to
  parsed objects/arrays (`CommentArray`/`CommentObject`, storing tokens via a Symbol key).
- `immer.produce()` **drops that metadata** the moment it has to copy an object it's
  mutating into — even on a *correctly*-parsed comment-preserving object, even for a
  simple nested `draft.inbounds.push(item)`.
- The store's actual behavior — parse `rawConfigText` fresh via `resolveMutableConfig()`,
  mutate the plain (non-immer) result directly, `stringifyJsonc()` it back — is what
  makes comment preservation work at all. It is **not** an oversight to "optimize away."

If you still want to reduce the re-parse cost, the correct angle is a different one:
memoize/debounce `stringifyJsonc()` (only regenerate `rawConfigText` when something
actually reads it — e.g. the raw-JSON view is open — not on every keystroke-adjacent
action), or hand-write a comment-metadata-preserving mutation helper that doesn't go
through immer. Either is real, careful work — re-run the empirical test in
`jsonc.test.ts`'s style against whatever you build before trusting it.

### 1.3 Two independent config-schema sources — know which one you're editing

- **Zod** (`src/core/xray/schemas/**`) — hand-authored, the actual source of truth for
  form validation (`src/core/validators/index.ts`) and `SchemaForm` rendering.
- **Auto-generated JSON Schema** (`src/utils/config.schema.json` +
  `src/core/xray-config.d.ts`) — produced by `scripts/generate-xray-schema.cjs` (regex-
  parses Go structs from `XTLS/Xray-core`'s `infra/conf`), backs only the raw-JSON
  editor's Ajv linter/autocomplete (`src/components/ui/JsonEditor.tsx`).

These can disagree. See item 3.C below for the actual fix (don't hand-patch both by
hand going forward).

### 1.4 The xray-core discovery pipeline (already built, keep using it)

`bun run schema:diff` (report only) / `bun run schema:sync` (report + update
`scripts/.xray-schema-lock.json`) — fetches Go structs from `XTLS/Xray-core`'s
`infra/conf`, diffs against the lock file, reports added/removed/changed fields.
Read-only; a human decides what to actually patch into the Zod schemas. Already found
and fixed two real gaps this session: `WireGuardConfig.remoteDNS`
(`src/core/xray/schemas/outbounds/wireguard.outbound.ts`) and `RoutingRule.localOS`
(`src/core/xray/schemas/routing.schema.ts`), both marked with `<ExperimentalBadge />`
(`src/components/ui/ExperimentalBadge.tsx`) since they're on Xray-core's main branch
but not in a tagged release yet.

## 2. Remaining work

Ordered roughly by value; not a strict sequence — items in different sections don't
depend on each other except where noted.

### A. Finish the schema-sync pipeline (Phase 1)

**A.1 — Human-readable text from official docs, not just Go comments.**
Go doc-comments in `infra/conf` (what `generate-xray-schema.cjs` currently extracts)
are sparse and written for Xray-core contributors, not end users. The real prose
descriptions live in `XTLS/Xray-docs-next` (markdown, one page per protocol/transport).
Build a second discovery source: fetch the relevant markdown page per protocol/transport,
extract per-field description text (likely from definition-list/table markup — inspect
a few pages first, e.g. the REALITY or VLESS pages, to find the actual structure), and
prefer it over the Go comment when drafting a new field's label. Land it as a new
script (`scripts/xray-docs-scrape.cjs` or fold into `xray-schema-diff.cjs`) that
augments the diff report with "here's the doc prose for this new field" — still
read-only/advisory, a human still writes the final `<FormField label help>` text.

**A.2 — Golden-fixture regression tests.**
Pattern borrowed from 3x-ui's newer frontend (`frontend/src/test/golden/fixtures/**`
in `MHSanaei/3x-ui` — worth pulling a few real examples for reference). Build
`src/core/__fixtures__/*.json` (8-10 real configs: VLESS+REALITY, WireGuard+remoteDNS,
Trojan+WS+TLS, routing with `localOS`, etc.) and a test that round-trips each through
`XrayConfigSchema.safeParse` → re-serialize → diff, catching schema changes that would
silently break an existing user's config. Put it at `src/core/xray/schemas/golden.test.ts`.

**A.3 — Unify the two schema sources (see 1.3).**
`zod-to-json-schema` is already a dependency but unused. Replace
`scripts/generate-xray-schema.cjs`'s output consumption in `JsonEditor.tsx` with a
schema derived from the Zod schemas directly (`zodToJsonSchema(XrayConfigSchema)` or
per-section). Keep the Go-struct discovery script (`xray-schema-diff.cjs`) purely as
the *discovery* mechanism from 1.4 — it stops being a second independent generator and
becomes the thing that tells you what to add to Zod. This removes the entire class of
"GUI form and raw-JSON linter disagree about what's valid" bugs.

**A.4 — Automate `schema:diff` on a schedule.**
Once A.1-A.3 land, wire `bun run schema:diff` into a weekly cron (see this session's
`schedule` skill/cron capability, or a GitHub Actions workflow) that opens a draft
PR/issue with the report — never auto-merges, wording still needs a human.

### B. Optional UI/logic polish (Phase 2 leftovers — not urgent)

**B.1 — `data-field="settings.password"` attributes on `ui/` primitives.**
Low effort, enables future automated verification that a field's markup is still
wired to the right config path after a visual rewrite. Add to `Input`/`Select`/
`Switch`/etc. as an optional prop, threaded from `useField`'s returned binding
(e.g. add a `fieldPath` string to `FieldBinding` in `useField.ts`, expose it, spread
it as `data-field` at call sites — or default it automatically from the `path` arg).

**B.2 — Extend `SchemaForm` toward full schema-driven UI + a labels layer.**
Bigger, optional, discussed but not started. Would mean: (a) a metadata layer mapping
field path → `{ label, help, group, experimental, sinceVersion }` (first draft
populated by A.1's doc-scrape, reviewed by a human — see the original plan's Phase 1
discussion of 3x-ui's i18next-based approach for the shape), and (b) widening
`SchemaForm`/`SchemaField` to consult that layer instead of `fieldConfigs` prop-drilling
everywhere. This is a genuine architecture decision (mechanism A vs B from 1.1 above,
scaled up) — don't start it without deciding whether the goal is "more fields need
zero hand-written JSX" (worth it) vs "just prettier labels on existing hand-written
forms" (not worth the churn).

### C. Store architecture (Phase 3)

**C.1 — Split `configStore.ts` (854 lines) into cooperating slices.**
Zustand's slice pattern: separate creator functions for (1) config CRUD + profiles/
history, (2) Remnawave connection/auth, (3) UI settings (`warpWorkerUrl`, `coreVersion`,
`autoSave`), combined via `create()((...a) => ({ ...createConfigSlice(...a), ...
createRemnawaveSlice(...a), ... }))`. Pure reorganization — do NOT change the CRUD
mutation strategy while doing this (see 1.2). Reduces the store's blast radius and
makes it easier to test slices independently (feeds into D below).

**C.2 — Do NOT attempt the produce()-based CRUD rewrite** without re-verifying 1.2
holds for whatever specific approach you're trying — it was a real, tested finding,
not a guess.

### D. Test coverage (Phase 4)

Only `src/utils/jsonc.test.ts` (9 tests) and `src/store/configStore.test.ts` (5 tests,
narrowly scoped to `updateItem`/`updateRoutingRule`/`updateBalancer`'s raw-text
handling) exist for the store today. Missing, roughly in priority order:

**D.1 — Store profile/history actions**: `createProfile`, `switchProfile`,
`duplicateProfile`, `deleteProfile` (including the "can't delete the only profile" and
"deleting the active profile switches to another" cases), `recordSnapshot` (including
the "skip if nothing changed" dedup), `restoreSnapshot`, `deleteSnapshot`,
`clearHistory`, `deduplicateHistory`, `setHistoryLimit` (including the clamp to
[10,1000] and the existing-history-truncation side effect). Use
`src/store/configStore.test.ts`'s existing IndexedDB/localStorage mock setup as the
template — **reuse it exactly** (including the `delete` method on the mock object
store) rather than writing a second incompatible mock, since Bun runs test files in a
shared global scope and two different `globalThis.indexedDB` mocks will fight each
other (this bit the first version of `configStore.test.ts` in this session — see its
git history/commit `6a7a0f8`'s message for the exact symptom).

**D.2 — `src/core/api/remnawave-client.ts`**: mock `fetch`, verify the res.ok-before-
empty-body-check ordering fixed in commit `ef9c9c4` stays correct (a 5xx with an empty
body must throw, not return `null`), the 401→auto-disconnect path in
`fetchRemnawaveProfiles`, and JSON-parse-failure handling.

**D.3 — `src/core/generators/crypto.ts`**: `generateUUID` format (v4 UUID regex),
`generateRealityKeyPair`/`generateX25519Keys` (base64url, no padding, correct byte
length for X25519), `generateShortId`/`generateRealityShortIds` (hex charset, length
bounds).

**D.4 — `src/core/validators/index.ts` and `src/core/diagnostics/index.ts`**: spot
gaps — `validateFullConfig` in particular is currently only exercised by
`src/utils/validator.test.ts` (pre-existing, check it's actually current) and isn't
called from any real save path except the two `runFullDiagnostics` gates added in
commit `ef9c9c4`; make sure the diagnostics rules (dangling routing targets,
REALITY/TLS cert requirements, Mux+Vision incompatibility) each have at least one
positive and one negative test case.

## 3. Explicitly deferred (not urgent, needs a product decision first — don't just do these)

- **Encrypt the Remnawave bearer token at rest** (currently plaintext in IndexedDB via
  `configStore.ts`'s `partialize`). Needs a decision on the encryption approach
  (Web Crypto with a key derived from what — there's no user password in this app)
  before implementing; flagged, not speced.
- **`src/core/git/gitEngine.ts`'s fake commit hash** (`Math.random()`-based, not
  content-derived) — cosmetic, only matters if someone starts relying on the hash for
  anything beyond a display string. Low priority.

## 4. If you (Gemini, or whoever) disagree with something above

The two most "confident-sounding but could be wrong" claims in this file are 1.2 (the
immer/comment-json interaction) and A.3's assumption that `zod-to-json-schema`'s
output is a drop-in replacement for what `JsonEditor.tsx`'s Ajv linter currently
consumes. Both were verified empirically this session, not assumed — but "verified
once, on one version of these libraries" isn't "provably true forever." If you plan to
override either, re-run an equivalent empirical check first (a throwaway script like
the one in commit `6a7a0f8`'s message) and record what you found, rather than trusting
either this document or your own intuition alone.
