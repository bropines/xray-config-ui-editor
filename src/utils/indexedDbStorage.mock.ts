/**
 * An in-memory stand-in for IndexedDB, for tests.
 *
 * The store persists through `idbStorage`, so anything that mounts a screen
 * drags the persist middleware in with it. Without this the middleware's
 * every read and write fails and logs, which buries whatever the test was
 * actually saying. Installed globally in test-setup.ts and used directly by
 * indexedDbStorage's own test.
 */

export class MockIDBDatabase {
    objectStoreNames = {
        contains: (_name: string) => true,
    };

    private store = new Map<string, any>();

    createObjectStore() {}

    transaction() {
        const store = this.store;
        const settle = (req: any, tx: any) => {
            queueMicrotask(() => {
                if (req.onsuccess) req.onsuccess();
                if (tx.oncomplete) tx.oncomplete();
            });
            return req;
        };
        const txObj = {
            oncomplete: null as any,
            onerror: null as any,
            onabort: null as any,
            objectStore: () => ({
                get: (key: string) => settle({ onsuccess: null, onerror: null, result: store.get(key) }, txObj),
                put: (val: any, key: string) => {
                    store.set(key, val);
                    return settle({ onsuccess: null, onerror: null }, txObj);
                },
                delete: (key: string) => {
                    store.delete(key);
                    return settle({ onsuccess: null, onerror: null }, txObj);
                },
            }),
        };
        return txObj;
    }
}

/** Puts a working `indexedDB` on the global object and hands back the db. */
export const installMockIndexedDB = (): MockIDBDatabase => {
    const db = new MockIDBDatabase();
    (globalThis as any).indexedDB = {
        open: () => {
            const req: any = { onsuccess: null, onerror: null, result: db };
            queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
            return req;
        },
    };
    return db;
};
