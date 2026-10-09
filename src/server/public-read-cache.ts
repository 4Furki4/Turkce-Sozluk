/** Bounded process-local cache for pure public reads; failed fills are never cached. */
export function createPublicReadCache<T>(ttlMs: number, maxEntries: number) {
  const entries = new Map<string, { promise: Promise<T>; expiresAt: number }>();
  const stats = { hits: 0, misses: 0, evictions: 0 };

  return {
    read(key: string, load: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const existing = entries.get(key);
      if (existing && existing.expiresAt > now) {
        entries.delete(key);
        entries.set(key, existing);
        stats.hits++;
        return existing.promise;
      }
      entries.delete(key);
      stats.misses++;
      const entry = { promise: Promise.resolve().then(load), expiresAt: now + ttlMs };
      entries.set(key, entry);
      if (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value!);
        stats.evictions++;
      }
      // An old failed fill must not delete a newer fill after invalidation/expiry.
      void entry.promise.catch(() => {
        if (entries.get(key) === entry) entries.delete(key);
      });
      return entry.promise;
    },
    invalidate() { entries.clear(); },
    stats() { return { ...stats, entries: entries.size }; },
  };
}
