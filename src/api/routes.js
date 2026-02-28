import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getUser,
    addToFavorites,
    removeFromFavorites,
    addToRecentlyPlayed,
    createPlaylist,
    addToPlaylist,
    deletePlaylist,
} from '../../database/db.js';
import helmet from "helmet";
import { getTopHits, searchTracks } from '../services/scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

// ─── Middleware ───────────────────────────────────────────────

export function createApp() {
    const app = express();

    app.use(cors());

    app.use(express.json({ limit: "1mb" }));

    // Telegram Mini App uchun CSP
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        "https://telegram.org",
                        "https://web.telegram.org",
                        "'unsafe-inline'",
                    ],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "blob:", "https:"],
                    fontSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https:"], // API boshqa domen bo'lsa shu yerga qo'shasan
                    frameSrc: ["'self'", "https://web.telegram.org"],
                    frameAncestors: ["'self'", "https://web.telegram.org"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    upgradeInsecureRequests: [],
                },
            },
            crossOriginResourcePolicy: { policy: "cross-origin" },
        })
    );

    app.use(express.static(path.join(__dirname, "../../web-app")));
    app.use("/api", router);

    return app;
}
// ─── Tiny async wrapper ───────────────────────────────────────
function wrap(fn) {
    return (req, res, next) =>
        Promise.resolve(fn(req, res)).catch(next);
}

router.get('/ac', (_, res) => res.send('Hello!'))
// ─── User ─────────────────────────────────────────────────────
router.get('/user/:id', wrap(async (req, res) => {
    const user = await getUser(Number(req.params.id));
    res.json(user ?? {});
}));

// ─── Favorites ────────────────────────────────────────────────
router.get('/favorites/:id', wrap(async (req, res) => {
    const user = await getUser(Number(req.params.id));
    res.json(user?.favorites ?? []);
}));

router.post('/favorites/add', wrap(async (req, res) => {
    const { telegramId, track } = req.body;
    const user = await addToFavorites(Number(telegramId), track);
    res.json(user?.favorites ?? []);
}));

router.post('/favorites/remove', wrap(async (req, res) => {
    const { telegramId, trackId } = req.body;
    const user = await removeFromFavorites(Number(telegramId), trackId);
    res.json(user?.favorites ?? []);
}));

// ─── Recently Played ──────────────────────────────────────────
router.get('/recent/:id', wrap(async (req, res) => {
    const user = await getUser(Number(req.params.id));
    res.json(user?.recentlyPlayed ?? []);
}));

router.post('/recent/add', wrap(async (req, res) => {
    const { telegramId, track } = req.body;
    const user = await addToRecentlyPlayed(Number(telegramId), track);
    res.json(user?.recentlyPlayed ?? []);
}));

// ─── Playlists ────────────────────────────────────────────────
router.get('/playlists/:id', wrap(async (req, res) => {
    const user = await getUser(Number(req.params.id));
    res.json(user?.playlists ?? []);
}));

router.post('/playlists/create', wrap(async (req, res) => {
    const { telegramId, name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    try {
        const user = await createPlaylist(Number(telegramId), name.trim(), description ?? '');
        res.json(user?.playlists ?? []);
    } catch (e) {
        if (e.message === 'PLAYLIST_EXISTS')
            return res.status(409).json({ error: 'Playlist already exists' });
        throw e;
    }
}));

router.post('/playlists/add', wrap(async (req, res) => {
    const { telegramId, playlistName, track } = req.body;
    const user = await addToPlaylist(Number(telegramId), playlistName, track);
    res.json(user?.playlists ?? []);
}));

router.delete('/playlists/:id/:name', wrap(async (req, res) => {
    const user = await deletePlaylist(Number(req.params.id), req.params.name);
    res.json(user?.playlists ?? []);
}));

// ─── Music ────────────────────────────────────────────────────
router.get('/top', wrap(async (_req, res) => {
    const tracks = await getTopHits();
    res.json(tracks);
}));

router.get('/search', wrap(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const tracks = await searchTracks(q);
    res.json(tracks);
}));

// ─── Export user data ─────────────────────────────────────────
router.get('/export/:id', wrap(async (req, res) => {
    const user = await getUser(Number(req.params.id));
    res.json(user ?? {});
}));

// ─── Error handler ────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
    console.error('[API Error]', err.message);
    res.status(500).json({ error: err.message });
}