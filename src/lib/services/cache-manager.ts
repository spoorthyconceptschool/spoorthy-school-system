/**
 * Smart Cache Manager using browser IndexedDB (Level 2 Persistent Cache)
 * Provides high-speed serialization/deserialization for large school collections
 * with automatic expiration checks and silent server/incognito fallbacks.
 */

const DB_NAME = "spoorthy_cache_db";
const STORE_NAME = "cache_store";
const DB_VERSION = 1;

interface CacheEntry<T = any> {
    key: string;
    data: T;
    expiresAt: number;
}

class IndexedDBCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase | null> | null = null;
    private memoryFallback = new Map<string, { data: any; expiresAt: number }>();

    constructor() {
        if (typeof window !== "undefined") {
            this.initPromise = this.initDB();
        }
    }

    private initDB(): Promise<IDBDatabase | null> {
        return new Promise((resolve) => {
            try {
                if (!window.indexedDB) {
                    console.warn("[CacheManager] IndexedDB is not supported. Falling back to in-memory.");
                    resolve(null);
                    return;
                }

                const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "key" });
                    }
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };

                request.onerror = (e) => {
                    console.warn("[CacheManager] IndexedDB initialization failed, using in-memory:", e);
                    resolve(null);
                };
            } catch (err) {
                console.warn("[CacheManager] IndexedDB initialization error, using in-memory:", err);
                resolve(null);
            }
        });
    }

    private async getDB(): Promise<IDBDatabase | null> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;
        return null;
    }

    /**
     * Retrieves an item from the cache. Returns null if missing or expired.
     */
    async get<T = any>(key: string): Promise<T | null> {
        // SSR check
        if (typeof window === "undefined") return null;

        const db = await this.getDB();
        if (!db) {
            // Memory fallback
            const item = this.memoryFallback.get(key);
            if (!item) return null;
            if (Date.now() > item.expiresAt) {
                this.memoryFallback.delete(key);
                return null;
            }
            return item.data as T;
        }

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result as CacheEntry<T> | undefined;
                    if (!result) {
                        resolve(null);
                        return;
                    }

                    if (Date.now() > result.expiresAt) {
                        // Delete expired record in background
                        this.delete(key).catch(() => {});
                        resolve(null);
                        return;
                    }

                    resolve(result.data);
                };

                request.onerror = () => {
                    resolve(null);
                };
            } catch (e) {
                resolve(null);
            }
        });
    }

    /**
     * Writes an item to the cache with a specified Time-to-Live (TTL).
     */
    async set<T = any>(key: string, data: T, ttlMs: number): Promise<void> {
        if (typeof window === "undefined") return;

        const expiresAt = Date.now() + ttlMs;
        const db = await this.getDB();

        if (!db) {
            // Memory fallback
            this.memoryFallback.set(key, { data, expiresAt });
            return;
        }

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const entry: CacheEntry<T> = { key, data, expiresAt };
                const request = store.put(entry);

                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            } catch (e) {
                resolve();
            }
        });
    }

    /**
     * Evicts a single item from the cache.
     */
    async delete(key: string): Promise<void> {
        if (typeof window === "undefined") return;

        const db = await this.getDB();
        if (!db) {
            this.memoryFallback.delete(key);
            return;
        }

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);

                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            } catch (e) {
                resolve();
            }
        });
    }

    /**
     * Clears all items matching a given key prefix, or wipes the entire cache store.
     */
    async clear(keyPrefix?: string): Promise<void> {
        if (typeof window === "undefined") return;

        const db = await this.getDB();
        if (!db) {
            if (keyPrefix) {
                for (const key of this.memoryFallback.keys()) {
                    if (key.startsWith(keyPrefix)) {
                        this.memoryFallback.delete(key);
                    }
                }
            } else {
                this.memoryFallback.clear();
            }
            return;
        }

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);

                if (!keyPrefix) {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                } else {
                    // Iterate and delete matches
                    const request = store.openCursor();
                    request.onsuccess = (event) => {
                        const cursor = (event.target as any).result;
                        if (cursor) {
                            const key = cursor.key as string;
                            if (key.startsWith(keyPrefix)) {
                                cursor.delete();
                            }
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    request.onerror = () => resolve();
                }
            } catch (e) {
                resolve();
            }
        });
    }
}

export const cacheManager = new IndexedDBCache();
