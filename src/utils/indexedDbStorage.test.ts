import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { idbStorage } from './indexedDbStorage';
import { installMockIndexedDB } from './indexedDbStorage.mock';

describe('indexedDbStorage', () => {
    beforeAll(() => {
        installMockIndexedDB();
    });

    // happy-dom supplies a real localStorage, and it is read-only on the
    // window — the legacy half of this module reads the genuine article.
    beforeEach(() => {
        localStorage.clear();
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
        localStorage.setItem(migrateKey, migrateValue);

        // idbStorage.getItem should find it, migrate it to IndexedDB and clear localStorage
        const retrieved = await idbStorage.getItem(migrateKey);
        expect(retrieved).toBe(migrateValue);

        // localStorage should now be cleaned up to free quota
        expect(localStorage.getItem(migrateKey)).toBeNull();

        // IndexedDB should now hold the value directly
        const fromIdb = await idbStorage.getItem(migrateKey);
        expect(fromIdb).toBe(migrateValue);

        // Clean up
        await idbStorage.removeItem(migrateKey);
    });

    it('should clean up localStorage on setItem to avoid quota exhaustion', async () => {
        const key = 'cleanup-key-' + Math.random().toString(36);
        const value = 'some-large-value';

        localStorage.setItem(key, 'old-stale-value');
        await idbStorage.setItem(key, value);

        expect(localStorage.getItem(key)).toBeNull();
        expect(await idbStorage.getItem(key)).toBe(value);

        await idbStorage.removeItem(key);
    });
});
