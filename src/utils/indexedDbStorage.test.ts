import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { idbStorage } from './indexedDbStorage';

// Minimal in-memory mock of IndexedDB and localStorage for test runner environment
class MockLocalStorage {
    private store: Record<string, string> = {};

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string): void {
        this.store[key] = value;
    }

    removeItem(key: string): void {
        delete this.store[key];
    }

    clear(): void {
        this.store = {};
    }
}

class MockIDBDatabase {
    objectStoreNames = {
        contains: (name: string) => true
    };

    private store = new Map<string, any>();

    createObjectStore() {}

    transaction() {
        const store = this.store;
        const txObj = {
            oncomplete: null as any,
            onerror: null as any,
            onabort: null as any,
            objectStore: () => ({
                get: (key: string) => {
                    const req: any = { onsuccess: null, onerror: null, result: store.get(key) };
                    queueMicrotask(() => {
                        if (req.onsuccess) req.onsuccess();
                        if (txObj.oncomplete) txObj.oncomplete();
                    });
                    return req;
                },
                put: (val: any, key: string) => {
                    store.set(key, val);
                    const req: any = { onsuccess: null, onerror: null };
                    queueMicrotask(() => {
                        if (req.onsuccess) req.onsuccess();
                        if (txObj.oncomplete) txObj.oncomplete();
                    });
                    return req;
                },
                delete: (key: string) => {
                    store.delete(key);
                    const req: any = { onsuccess: null, onerror: null };
                    queueMicrotask(() => {
                        if (req.onsuccess) req.onsuccess();
                        if (txObj.oncomplete) txObj.oncomplete();
                    });
                    return req;
                }
            })
        };
        return txObj;
    }
}

describe('indexedDbStorage', () => {
    let mockDb: MockIDBDatabase;
    let mockStorage: MockLocalStorage;

    beforeAll(() => {
        mockDb = new MockIDBDatabase();
        mockStorage = new MockLocalStorage();

        (globalThis as any).indexedDB = {
            open: () => {
                const req: any = { onsuccess: null, onerror: null, result: mockDb };
                queueMicrotask(() => {
                    if (req.onsuccess) req.onsuccess();
                });
                return req;
            }
        };

        (globalThis as any).localStorage = mockStorage;
    });

    beforeEach(() => {
        mockStorage.clear();
    });

    it('should set and get items from storage', async () => {
        const testKey = 'test-key-' + Math.random().toString(36);
        const testValue = JSON.stringify({ hello: 'world', count: 42 });

        await idbStorage.setItem(testKey, testValue);
        const result = await idbStorage.getItem(testKey);

        expect(result).toBe(testValue);

        await idbStorage.removeItem(testKey);
        const afterDelete = await idbStorage.getItem(testKey);
        expect(afterDelete).toBeNull();
    });

    it('should migrate from localStorage if key is missing in IndexedDB', async () => {
        const migrateKey = 'migrate-key-' + Math.random().toString(36);
        const migrateValue = JSON.stringify({ migrated: true, timestamp: 12345 });

        // Put into localStorage first
        mockStorage.setItem(migrateKey, migrateValue);

        // idbStorage.getItem should find it, migrate it to IndexedDB and clear localStorage
        const retrieved = await idbStorage.getItem(migrateKey);
        expect(retrieved).toBe(migrateValue);

        // localStorage should now be cleaned up to free quota
        expect(mockStorage.getItem(migrateKey)).toBeNull();

        // IndexedDB should now hold the value directly
        const fromIdb = await idbStorage.getItem(migrateKey);
        expect(fromIdb).toBe(migrateValue);

        // Clean up
        await idbStorage.removeItem(migrateKey);
    });

    it('should clean up localStorage on setItem to avoid quota exhaustion', async () => {
        const key = 'cleanup-key-' + Math.random().toString(36);
        const value = 'some-large-value';

        mockStorage.setItem(key, 'old-stale-value');
        await idbStorage.setItem(key, value);

        expect(mockStorage.getItem(key)).toBeNull();
        expect(await idbStorage.getItem(key)).toBe(value);

        await idbStorage.removeItem(key);
    });
});
