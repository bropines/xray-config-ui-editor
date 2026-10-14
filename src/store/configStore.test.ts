import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

// configStore.ts wires zustand's `persist` middleware to IndexedDB
// (src/utils/indexedDbStorage.ts) at module-load time, so IndexedDB has to
// exist before the store module is imported. test-setup.ts installs the
// shared in-memory stand-in as a preload, which runs before any of this, and
// happy-dom supplies the localStorage half.

const { useConfigStore } = await import('./configStore');
const { parseJsonc } = await import('../utils/jsonc');

// Connecting a panel starts its catalog fetches. Nothing here is about what
// a panel answers, and those requests used to go out for real — to a real
// host, with a made-up token, on every run. Every fetch in this file fails
// at once instead, the way an unreachable panel would.
const realFetch = globalThis.fetch;
beforeEach(() => {
    globalThis.fetch = (async () => { throw new TypeError('network is off in configStore tests'); }) as unknown as typeof fetch;
});
afterEach(() => {
    globalThis.fetch = realFetch;
});

const BASE_CONFIG_TEXT = `{
  // top-level comment, unrelated to the item under test
  "inbounds": [
    { "tag": "keep-me" }
  ],
  "outbounds": [],
  "routing": { "rules": [], "balancers": [] }
}`;

function resetStoreWithConfig(rawText: string) {
    const parsed = parseJsonc(rawText);
    useConfigStore.setState({
        config: parsed as any,
        rawConfigText: rawText,
    });
}

describe('configStore — updateItem raw-text comment preservation', () => {
    beforeEach(() => {
        resetStoreWithConfig(BASE_CONFIG_TEXT);
    });

    it('preserves a comment the user typed in an item\'s own raw-JSON edit', () => {
        const itemRaw = `{\n  "tag": "vless-in", // remember this port is for staff only\n  "port": 8443\n}`;
        useConfigStore.getState().updateItem('inbounds', 0, { tag: 'vless-in', port: 8443 }, itemRaw);

        const { rawConfigText } = useConfigStore.getState();
        expect(rawConfigText).toContain('remember this port is for staff only');
        expect(rawConfigText).toContain('// top-level comment, unrelated to the item under test');
    });

    it('falls back to the plain object when rawText is omitted (existing form-edit path, unaffected)', () => {
        useConfigStore.getState().updateItem('inbounds', 0, { tag: 'form-edited', port: 1080 });

        const { config } = useConfigStore.getState();
        expect((config as any).inbounds[0].tag).toBe('form-edited');
        expect((config as any).inbounds[0].port).toBe(1080);
    });

    it('falls back to the plain object when rawText fails to parse, without throwing', () => {
        expect(() => {
            useConfigStore.getState().updateItem('inbounds', 0, { tag: 'fallback' }, '{ not valid json');
        }).not.toThrow();

        const { config } = useConfigStore.getState();
        expect((config as any).inbounds[0].tag).toBe('fallback');
    });
});

describe('configStore — updateRoutingRule / updateBalancer raw-text comment preservation', () => {
    beforeEach(() => {
        resetStoreWithConfig(BASE_CONFIG_TEXT);
        // Seed one rule and one balancer to update.
        useConfigStore.getState().reorderRules([{ type: 'field', outboundTag: 'proxy' } as any]);
        useConfigStore.setState((s: any) => ({
            config: { ...s.config, routing: { ...s.config.routing, balancers: [{ tag: 'b1', selector: [] }] } },
        }));
    });

    it('updateRoutingRule preserves a comment typed in that one rule\'s raw JSON, without rebuilding the whole rules array as a plain object', () => {
        const ruleRaw = `{\n  "type": "field",\n  "outboundTag": "proxy", // pin this to the fast exit\n  "domain": ["example.com"]\n}`;
        useConfigStore.getState().updateRoutingRule(0, { type: 'field', outboundTag: 'proxy', domain: ['example.com'] } as any, ruleRaw);

        const { rawConfigText } = useConfigStore.getState();
        expect(rawConfigText).toContain('pin this to the fast exit');
    });

    it('updateBalancer preserves a comment typed in that one balancer\'s raw JSON', () => {
        const balancerRaw = `{\n  "tag": "b1", // primary pool\n  "selector": ["node-"]\n}`;
        useConfigStore.getState().updateBalancer(0, { tag: 'b1', selector: ['node-'] }, balancerRaw);

        const { rawConfigText } = useConfigStore.getState();
        expect(rawConfigText).toContain('primary pool');
    });
});


describe('configStore — createProfile with an explicit config', () => {
    beforeEach(() => {
        resetStoreWithConfig(BASE_CONFIG_TEXT);
    });

    // Regression: the new profile used to inherit the *currently open*
    // config's rawConfigText. Since switchProfile prefers rawConfigText over
    // config, and every CRUD action re-parses it, opening the new profile
    // silently brought the old config back — which is exactly what the
    // generated client configs from the Local Balancer builder hit.
    it('stores raw text derived from the config it was given, not from the open one', () => {
        const generated: any = {
            inbounds: [{ tag: 'socks', port: 10808 }],
            outbounds: [{ tag: 'proxy', protocol: 'vless' }],
        };
        useConfigStore.getState().createProfile('Generated', generated);

        const { profiles, activeProfileId, rawConfigText } = useConfigStore.getState();
        const created = profiles.find(p => p.id === activeProfileId)!;

        expect(created.name).toBe('Generated');
        expect(created.rawConfigText).toContain('"proxy"');
        expect(created.rawConfigText).not.toContain('keep-me');
        expect(rawConfigText).not.toContain('keep-me');
        expect(JSON.parse(created.rawConfigText!)).toEqual(generated);
    });

    it('still snapshots the currently open config when no config is supplied', () => {
        useConfigStore.getState().createProfile('From current');
        const { profiles, activeProfileId } = useConfigStore.getState();
        const created = profiles.find(p => p.id === activeProfileId)!;
        expect(created.rawConfigText).toContain('keep-me');
    });
});

describe('more than one panel', () => {
    const reset = () => useConfigStore.setState({
        remnawave: {
            url: '', token: null, connected: false,
            activeProfileUuid: null, profiles: [],
            accounts: [], activeAccountId: null,
        },
    } as any);

    it('remembers a panel the moment it is connected to', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru/', 'token-a');

        const { accounts, activeAccountId } = useConfigStore.getState().remnawave;
        expect(accounts).toHaveLength(1);
        expect(accounts[0]!.label).toBe('bropines.remna.ru');
        expect(accounts[0]!.token).toBe('token-a');
        expect(activeAccountId).toBe(accounts[0]!.id);
    });

    it('keeps a second panel beside the first', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru', 'token-a');
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');

        const { accounts, url, token } = useConfigStore.getState().remnawave;
        expect(accounts.map(a => a.label)).toEqual(['bropines.remna.ru', 'olsg.vpn.ru']);
        expect(url).toBe('https://olsg.vpn.ru');
        expect(token).toBe('token-b');
    });

    it('re-connecting the same panel updates its token instead of listing it twice', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru', 'old');
        // A trailing slash is not a different panel.
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru/', 'new');

        const { accounts } = useConfigStore.getState().remnawave;
        expect(accounts).toHaveLength(1);
        expect(accounts[0]!.token).toBe('new');
    });

    it('switching swaps the connection and drops what the last panel put there', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru', 'token-a');
        const first = useConfigStore.getState().remnawave.accounts[0]!.id;
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');

        // State the panel we are leaving filled in.
        useConfigStore.setState(state => ({
            remnawave: { ...state.remnawave, activeProfileUuid: 'profile-of-olsg' },
            panelCatalog: { hosts: [{ uuid: 'h1' }], inbounds: {}, loading: false, error: null, fetchedAt: Date.now() },
            snippetLibrary: { ...state.snippetLibrary, panel: [{ name: 'S', body: [] }] },
        }) as any);

        useConfigStore.getState().switchRemnawaveAccount(first);

        const state = useConfigStore.getState();
        expect(state.remnawave.url).toBe('https://bropines.remna.ru');
        expect(state.remnawave.token).toBe('token-a');
        expect(state.remnawave.activeAccountId).toBe(first);
        expect(state.remnawave.activeProfileUuid).toBeNull();
        expect(state.panelCatalog.hosts).toEqual([]);
        expect(state.snippetLibrary.panel).toEqual([]);
    });

    it('forgetting a panel that is not in use leaves the connection alone', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://bropines.remna.ru', 'token-a');
        const first = useConfigStore.getState().remnawave.accounts[0]!.id;
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');

        useConfigStore.getState().forgetRemnawaveAccount(first);

        const { accounts, connected, token } = useConfigStore.getState().remnawave;
        expect(accounts.map(a => a.label)).toEqual(['olsg.vpn.ru']);
        expect(connected).toBe(true);
        expect(token).toBe('token-b');
    });

    it('forgetting the panel in use disconnects rather than leaving a nameless token', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');
        const active = useConfigStore.getState().remnawave.activeAccountId!;

        useConfigStore.getState().forgetRemnawaveAccount(active);

        const { accounts, connected, token, activeAccountId } = useConfigStore.getState().remnawave;
        expect(accounts).toEqual([]);
        expect(connected).toBe(false);
        expect(token).toBeNull();
        expect(activeAccountId).toBeNull();
    });

    it('can be given a name of its own, and falls back to the host when cleared', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');
        const id = useConfigStore.getState().remnawave.accounts[0]!.id;

        useConfigStore.getState().renameRemnawaveAccount(id, '  Прод  ');
        expect(useConfigStore.getState().remnawave.accounts[0]!.label).toBe('Прод');

        useConfigStore.getState().renameRemnawaveAccount(id, '   ');
        expect(useConfigStore.getState().remnawave.accounts[0]!.label).toBe('olsg.vpn.ru');
    });

    it('disconnecting keeps the panels but ends the session', () => {
        reset();
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');
        useConfigStore.getState().disconnectRemnawave();

        const { accounts, connected, activeAccountId } = useConfigStore.getState().remnawave;
        expect(accounts).toHaveLength(1);
        expect(connected).toBe(false);
        expect(activeAccountId).toBeNull();
    });
});

describe('a token the user did not ask us to keep', () => {
    // Connecting asks the panel for its profiles, and these panels are not
    // real. Nothing here needs the answer.
    const realFetch = globalThis.fetch;
    beforeEach(() => {
        globalThis.fetch = (async () => {
            throw new Error('no network in tests');
        }) as unknown as typeof fetch;
    });
    afterEach(() => {
        globalThis.fetch = realFetch;
    });

    /**
     * `partialize` is the whole of the promise the "remember this token"
     * switch makes: it decides what reaches IndexedDB, which holds it in plain
     * text. Reaching for it through zustand's own persist API tests the thing
     * that actually runs, rather than a re-implementation of it.
     */
    const persisted = () => {
        const options = useConfigStore.persist.getOptions() as any;
        return options.partialize(useConfigStore.getState()).remnawave;
    };

    const seed = (accounts: any[], activeId: string | null) => {
        const active = accounts.find(account => account.id === activeId);
        useConfigStore.setState({
            remnawave: {
                url: active?.url ?? '',
                token: active?.token ?? null,
                connected: Boolean(active),
                activeProfileUuid: null,
                profiles: [],
                accounts,
                activeAccountId: activeId,
            },
        } as any);
    };

    const PANEL = (over: Record<string, unknown> = {}) => ({
        id: 'a', label: 'olsg.vpn.ru', url: 'https://olsg.vpn.ru',
        token: 'token-a', remember: false, ...over,
    });

    it('is what a connection gets unless it says otherwise', () => {
        seed([], null);
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b');
        expect(useConfigStore.getState().remnawave.accounts[0]!.remember).toBe(true);
    });

    it('is dropped when the connection asked for that', () => {
        seed([], null);
        useConfigStore.getState().connectRemnawaveToken('https://olsg.vpn.ru', 'token-b', { remember: false });
        expect(useConfigStore.getState().remnawave.accounts[0]!.remember).toBe(false);
    });

    it('never reaches storage — not in the panel entry, not in the live connection', () => {
        seed([PANEL()], 'a');
        const saved = persisted();
        expect(saved.token).toBeNull();
        expect(saved.accounts[0].token).toBe('');
        // The panel itself is still worth remembering; only its secret is not.
        expect(saved.accounts[0].url).toBe('https://olsg.vpn.ru');
        expect(saved.accounts[0].label).toBe('olsg.vpn.ru');
    });

    it('does not leave a connected session behind with nothing to connect with', () => {
        seed([PANEL()], 'a');
        expect(useConfigStore.getState().remnawave.connected).toBe(true);
        expect(persisted().connected).toBe(false);
    });

    it('is stored, token and all, once the switch is on', () => {
        seed([PANEL({ remember: true })], 'a');
        const saved = persisted();
        expect(saved.token).toBe('token-a');
        expect(saved.accounts[0].token).toBe('token-a');
        expect(saved.connected).toBe(true);
    });

    it('stops being stored the moment the switch goes off', () => {
        seed([PANEL({ remember: true })], 'a');
        useConfigStore.getState().setRemnawaveAccountRemember('a', false);

        // The session carries on — nothing is lost until the page reloads.
        expect(useConfigStore.getState().remnawave.token).toBe('token-a');
        expect(useConfigStore.getState().remnawave.connected).toBe(true);
        expect(persisted().token).toBeNull();
    });

    it('keeps one panel\'s token while dropping another\'s', () => {
        seed([
            PANEL({ remember: true }),
            { id: 'b', label: 'bropines.remna.ru', url: 'https://bropines.remna.ru', token: 'token-b', remember: false },
        ], 'a');
        const saved = persisted();
        expect(saved.accounts[0].token).toBe('token-a');
        expect(saved.accounts[1].token).toBe('');
    });

    it('is asked for, not faked, when that panel is selected again', () => {
        // What a reload leaves behind: the panel, without its token.
        seed([PANEL({ token: '' })], null);
        useConfigStore.getState().switchRemnawaveAccount('a');

        const { url, token, connected, activeAccountId } = useConfigStore.getState().remnawave;
        expect(url).toBe('https://olsg.vpn.ru');
        expect(token).toBeNull();
        expect(connected).toBe(false);
        expect(activeAccountId).toBe('a');
    });
});

describe('a panel saved before the switch existed', () => {
    // `merge` is handed the store as it is the moment IndexedDB answers —
    // defaults, nothing else. Tests above leave panels behind, and merging
    // against those would answer a question nobody asks in a real session.
    beforeEach(() => {
        useConfigStore.setState({
            remnawave: {
                url: '', token: null, connected: false,
                activeProfileUuid: null, profiles: [],
                accounts: [], activeAccountId: null,
            },
        } as any);
    });

    it('keeps the token it already had on disk', () => {
        const options = useConfigStore.persist.getOptions() as any;
        const merged = options.merge(
            {
                remnawave: {
                    url: 'https://olsg.vpn.ru',
                    token: 'token-a',
                    connected: true,
                    activeProfileUuid: null,
                    // No `remember` — this shape predates it.
                    accounts: [{ id: 'a', label: 'olsg.vpn.ru', url: 'https://olsg.vpn.ru', token: 'token-a' }],
                    activeAccountId: 'a',
                },
            },
            useConfigStore.getState(),
        );

        expect(merged.remnawave.accounts[0].remember).toBe(true);
        expect(merged.remnawave.accounts[0].token).toBe('token-a');
    });

    it('becomes a saved panel when it predates the list itself', () => {
        const options = useConfigStore.persist.getOptions() as any;
        const merged = options.merge(
            {
                // One connection, no `accounts` key at all — the shape before
                // there was more than one panel.
                remnawave: {
                    url: 'https://olsg.vpn.ru',
                    token: 'token-a',
                    connected: true,
                    activeProfileUuid: null,
                },
            },
            useConfigStore.getState(),
        );

        expect(merged.remnawave.accounts).toHaveLength(1);
        expect(merged.remnawave.accounts[0].url).toBe('https://olsg.vpn.ru');
        expect(merged.remnawave.accounts[0].token).toBe('token-a');
        expect(merged.remnawave.accounts[0].remember).toBe(true);
        expect(merged.remnawave.activeAccountId).toBe(merged.remnawave.accounts[0].id);

        // And so it survives the next save, rather than belonging to no entry
        // and being dropped as a token nobody said could be kept.
        useConfigStore.setState({ remnawave: merged.remnawave } as any);
        expect(options.partialize(useConfigStore.getState()).remnawave.token).toBe('token-a');
    });

    it('is not adopted twice when the list already has that panel', () => {
        const options = useConfigStore.persist.getOptions() as any;
        const merged = options.merge(
            {
                remnawave: {
                    // A trailing slash is not a second panel.
                    url: 'https://olsg.vpn.ru/',
                    token: 'token-a',
                    connected: true,
                    activeProfileUuid: null,
                    accounts: [{ id: 'a', label: 'olsg.vpn.ru', url: 'https://olsg.vpn.ru', token: 'token-a' }],
                    activeAccountId: 'a',
                },
            },
            useConfigStore.getState(),
        );

        expect(merged.remnawave.accounts).toHaveLength(1);
        expect(merged.remnawave.activeAccountId).toBe('a');
    });
});
