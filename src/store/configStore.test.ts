import { describe, it, expect, beforeEach } from 'bun:test';

// configStore.ts wires zustand's `persist` middleware to IndexedDB
// (src/utils/indexedDbStorage.ts) at module-load time, so IndexedDB (and a
// localStorage fallback) must exist on globalThis BEFORE the store module is
// imported — same minimal in-memory mock indexedDbStorage.test.ts uses.
class MockLocalStorage {
    private store: Record<string, string> = {};
    getItem(key: string): string | null { return this.store[key] ?? null; }
    setItem(key: string, value: string): void { this.store[key] = value; }
    removeItem(key: string): void { delete this.store[key]; }
    clear(): void { this.store = {}; }
}

class MockIDBDatabase {
    objectStoreNames = { contains: () => true };
    private store = new Map<string, any>();
    createObjectStore() {}
    transaction() {
        const store = this.store;
        const txObj: any = { oncomplete: null, onerror: null, onabort: null };
        txObj.objectStore = () => ({
            get: (key: string) => {
                const req: any = { onsuccess: null, onerror: null, result: store.get(key) };
                queueMicrotask(() => { req.onsuccess?.(); txObj.oncomplete?.(); });
                return req;
            },
            put: (val: any, key: string) => {
                store.set(key, val);
                const req: any = { onsuccess: null, onerror: null };
                queueMicrotask(() => { req.onsuccess?.(); txObj.oncomplete?.(); });
                return req;
            },
            // Bun runs test files in a shared global scope, so this mock's
            // globalThis.indexedDB assignment can end up being the one still
            // active when indexedDbStorage.test.ts's own removeItem test
            // runs — needs the same surface as that test's mock, not just
            // what this file's own tests happen to call.
            delete: (key: string) => {
                store.delete(key);
                const req: any = { onsuccess: null, onerror: null };
                queueMicrotask(() => { req.onsuccess?.(); txObj.oncomplete?.(); });
                return req;
            },
        });
        return txObj;
    }
}

// Install the mocks as plain top-level statements (NOT inside beforeAll) so
// they're in place before the dynamic import below runs — configStore.ts
// creates its zustand store (and kicks off persist's synchronous hydrate
// attempt) at module-evaluation time, which happens before any beforeAll
// hook would fire.
const mockDb = new MockIDBDatabase();
(globalThis as any).indexedDB = {
    open: () => {
        const req: any = { onsuccess: null, onerror: null, result: mockDb };
        queueMicrotask(() => req.onsuccess?.());
        return req;
    },
};
(globalThis as any).localStorage = new MockLocalStorage();

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
