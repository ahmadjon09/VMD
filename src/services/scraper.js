import * as cheerio from 'cheerio';
import { promises as fs } from 'node:fs';
import { Readable, Transform } from 'node:stream';

// ─── Config ───────────────────────────────────────────────────
const BASE_URL        = 'vuxo7.com';
const TIMEOUT_MS      = 15_000;
export const MAX_FILE = 50 * 1024 * 1024;   // 50 MB
const DEBUG_HTML      = process.env.DEBUG_HTML === '1';

// ─── Headers ──────────────────────────────────────────────────
let FILE_HEADERS = {};
try {
    FILE_HEADERS = JSON.parse(await fs.readFile('./header.json', 'utf8'));
} catch { /* optional override */ }

const BASE_HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    accept:       '*/*',
    'accept-language': 'en-US,en;q=0.9',
    ...FILE_HEADERS,
};

const AUDIO_HEADERS = {
    ...BASE_HEADERS,
    referer: BASE_HEADERS.referer ?? `https://${BASE_URL}/`,
    origin:  BASE_HEADERS.origin  ?? `https://${BASE_URL}`,
};

// ─── Helpers ──────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function retry(fn, attempts = 3) {
    let last;
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); }
        catch (e) { last = e; await sleep(300 * 2 ** i); }
    }
    throw last;
}

async function fetchText(url) {
    const ac = new AbortController();
    const t  = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
        const res  = await fetch(url, { signal: ac.signal, headers: BASE_HEADERS, redirect: 'follow' });
        const html = await res.text();
        if (DEBUG_HTML) await fs.writeFile('./debug_last.html', html, 'utf8').catch(() => {});
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
        return html;
    } finally {
        clearTimeout(t);
    }
}

// ─── Parser ───────────────────────────────────────────────────
function parseHtml(html) {
    const $        = cheerio.load(html);
    const playlist = $('ul.playlist');
    if (!playlist.length) throw new Error('Playlist element not found in HTML');

    const tracks = [];
    playlist.find('li').each((i, el) => {
        const li        = $(el);
        const performer = li.find('.playlist-name-artist').first().text().trim();
        const title     = li.find('.playlist-name-title').first().text().trim();
        const audio_url = li.find('.playlist-play').first().attr('data-url') ?? '';

        if (!performer || !title || !audio_url) return;

        tracks.push({
            index:     i,
            performer,
            title,
            name:      `${performer} - ${title}`,
            audio_url: String(audio_url),
        });
    });
    return tracks;
}

async function fetchTracks(url) {
    return retry(async () => parseHtml(await fetchText(url)));
}

// ─── Public API ───────────────────────────────────────────────
export async function getTopHits() {
    return fetchTracks(`https://${BASE_URL}`);
}

export async function searchTracks(keyword) {
    const cleaned = String(keyword ?? '')
        .replace(/[^\w\s]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    if (!cleaned) throw new Error('Empty keyword after sanitisation');
    return fetchTracks(`https://${cleaned}.${BASE_URL}`);
}

// ─── Audio Stream ─────────────────────────────────────────────
class SizeLimitTransform extends Transform {
    constructor(limit) {
        super();
        this._limit = limit;
        this._bytes = 0;
    }
    _transform(chunk, _, cb) {
        this._bytes += chunk.length;
        if (this._bytes > this._limit) {
            return cb(new Error(`File exceeds ${this._limit} bytes`));
        }
        cb(null, chunk);
    }
}

/**
 * Returns a Node.js readable stream for the given audio URL.
 * Throws if the server signals the file is too large.
 */
export async function getAudioStream(url) {
    const ac = new AbortController();
    const t  = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ac.signal, headers: AUDIO_HEADERS, redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status} for audio`);

        const contentLength = Number(res.headers.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_FILE) {
            throw new Error(`File too large: ${contentLength} bytes`);
        }

        if (!res.body) throw new Error('Empty response body');

        const nodeStream = Readable.fromWeb(res.body);
        return nodeStream.pipe(new SizeLimitTransform(MAX_FILE));
    } finally {
        clearTimeout(t);
    }
}