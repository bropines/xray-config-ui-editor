import { describe, it, expect, beforeEach } from 'bun:test';

// configStore.ts wires zustand's `persist` middleware to IndexedDB
// (src/utils/indexedDbStorage.ts) at module-load time, so IndexedDB has to
// exist before the store module is imported. test-setup.ts installs the
// shared in-memory stand-in as a preload, which runs before any of this, and
// happy-dom supplies the localStorage half.

const { useConfigStore } = await import('./configStore');
const { parseJsonc } = await import('../utils/jsonc');

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
