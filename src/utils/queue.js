/**
 * Simple concurrency-limited queue.
 * Usage:
 *   const queue = new DownloadQueue(5);
 *   await queue.run(() => doSomethingAsync());
 */
export class DownloadQueue {
    constructor(concurrency = 5) {
        this._concurrency = concurrency;
        this._active      = 0;
        this._waiters     = [];
    }

    async run(fn) {
        await this._acquire();
        try {
            return await fn();
        } finally {
            this._release();
        }
    }

    _acquire() {
        if (this._active < this._concurrency) {
            this._active++;
            return Promise.resolve();
        }
        return new Promise((resolve) => this._waiters.push(resolve));
    }

    _release() {
        this._active = Math.max(0, this._active - 1);
        const next   = this._waiters.shift();
        if (next) { this._active++; next(); }
    }
}