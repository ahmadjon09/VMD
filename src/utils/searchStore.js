const TTL_MS = 60 * 60 * 1000; // 1 hour

class SearchStore {
    constructor() {
        this._map = new Map();
        this._seq = 1;

        // Purge expired entries every 30 min
        setInterval(() => this._purge(), 30 * 60 * 1000).unref();
    }

    save(keyword, tracks) {
        const id = this._seq++;
        this._map.set(id, { keyword, tracks, createdAt: Date.now() });
        return id;
    }

    get(id) {
        const entry = this._map.get(id);
        if (!entry) return null;
        if (Date.now() - entry.createdAt > TTL_MS) {
            this._map.delete(id);
            return null;
        }
        return entry;
    }

    _purge() {
        const cutoff = Date.now() - TTL_MS;
        for (const [id, entry] of this._map) {
            if (entry.createdAt < cutoff) this._map.delete(id);
        }
    }
}

export const searchStore = new SearchStore();