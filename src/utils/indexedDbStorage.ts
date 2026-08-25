import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'xray_editor_db';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };

                request.onsuccess = () => {
                    const db = request.result;
                    // The cached connection can go stale without us noticing:
                    // another tab upgrading the DB version, or the browser
                    // force-closing it (private-mode eviction, etc). Without
                    // these handlers every subsequent getItem/setItem call
                    // would silently fail inside its own try/catch and fall
                    // back to the localStorage quota we migrated away from —
                    // just later, and with only a console warning to show for it.
                    db.onversionchange = () => {
                        console.warn('[Storage] IndexedDB version change detected elsewhere, closing this connection.');
                        db.close();
                        dbPromise = null;
                    };
                    db.onclose = () => {
                        console.warn('[Storage] IndexedDB connection closed unexpectedly.');
                        dbPromise = null;
                    };
                    resolve(db);
                };

                request.onerror = () => {
                    dbPromise = null;
                    reject(request.error || new Error('Failed to open IndexedDB'));
                };

                request.onblocked = () => {
                    console.warn('[Storage] IndexedDB open request blocked');
                };
            } catch (err) {
                dbPromise = null;
                reject(err);
            }
        });
    }

    return dbPromise;
}

export const idbStorage: StateStorage = {
    async getItem(name: string): Promise<string | null> {
        try {
            const db = await getDB();
            const val = await new Promise<string | null>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(name);
                req.onsuccess = () => resolve(req.result ?? null);
                req.onerror = () => reject(req.error);
            });

            if (val !== null && val !== undefined) {
                return val;
            }

            // Fallback & Migration: Check if data exists in legacy localStorage
            if (typeof localStorage !== 'undefined') {
                const legacyVal = localStorage.getItem(name);
                if (legacyVal) {
                    console.log(`[Storage] Migrating "${name}" from localStorage to IndexedDB (${(legacyVal.length / 1024).toFixed(1)} KB)...`);
                    try {
                        // Persist to IndexedDB
                        await idbStorage.setItem(name, legacyVal);
                        // Clean up localStorage to free up the 5MB quota
                        localStorage.removeItem(name);
                        console.log(`[Storage] Migration of "${name}" to IndexedDB complete, freed localStorage quota.`);
                    } catch (mErr) {
                        console.warn('[Storage] Failed to clear legacy localStorage after migration:', mErr);
                    }
                    return legacyVal;
                }
            }

            return null;
        } catch (err) {
            console.warn('[Storage] IndexedDB getItem error, falling back to localStorage:', err);
            try {
                return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
            } catch {
                return null;
            }
        }
    },

    async setItem(name: string, value: string): Promise<void> {
        try {
            const db = await getDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(value, name);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                tx.onabort = () => reject(tx.error);
            });

            // Ensure any legacy localStorage key is removed to avoid duplicate storage & quota issues
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem(name);
                } catch {
                    // Ignore
                }
            }
        } catch (err) {
            console.error('[Storage] IndexedDB setItem error:', err);
            // Fallback attempt to localStorage if IndexedDB failed completely
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(name, value);
                }
            } catch (fallbackErr) {
                console.warn('[Storage] Fallback localStorage setItem also failed (likely quota limit):', fallbackErr);
            }
        }
    },

    async removeItem(name: string): Promise<void> {
        try {
            const db = await getDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(name);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                tx.onabort = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('[Storage] IndexedDB removeItem error:', err);
        }

        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(name);
            } catch {
                // Ignore
            }
        }
    }
};
