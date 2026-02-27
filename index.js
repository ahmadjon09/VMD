import { Telegraf, Markup } from "telegraf";
import * as cheerio from "cheerio";
import { promises as fs } from "node:fs";
import { Readable, Transform } from "node:stream";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, getUser, createOrUpdateUser, addToFavorites, removeFromFavorites, addToRecentlyPlayed, createPlaylist, addToPlaylist } from './database/db.js';

dotenv.config();

// ===== Konfiguratsiya =====
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN env is required");

const BASE_URL = "vuxo7.com";
const TIMEOUT_MS = 20000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TRACKS_PER_PAGE = 10;
const MAX_PARALLEL_DOWNLOADS = Number(process.env.MAX_PARALLEL_DOWNLOADS || 4);
const DEBUG_HTML = process.env.DEBUG_HTML === "1";
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-domain.com';

// ===== Express server for Web App =====
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('web-app'));

// API endpoints
app.get('/api/user/:telegramId', async (req, res) => {
    try {
        const user = await getUser(Number(req.params.telegramId));
        res.json(user || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/favorites/add', async (req, res) => {
    try {
        const { telegramId, track } = req.body;
        const user = await addToFavorites(telegramId, track);
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/favorites/remove', async (req, res) => {
    try {
        const { telegramId, track } = req.body;
        const trackId = `${track.performer}-${track.title}`.replace(/[^a-zA-Z0-9]/g, '');
        const user = await removeFromFavorites(telegramId, trackId);
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/favorites/:telegramId', async (req, res) => {
    try {
        const user = await getUser(Number(req.params.telegramId));
        res.json(user?.favorites || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/recent/add', async (req, res) => {
    try {
        const { telegramId, track } = req.body;
        const user = await addToRecentlyPlayed(telegramId, track);
        res.json(user.recentlyPlayed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recent/:telegramId', async (req, res) => {
    try {
        const user = await getUser(Number(req.params.telegramId));
        res.json(user?.recentlyPlayed || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/playlists/create', async (req, res) => {
    try {
        const { telegramId, name, description } = req.body;
        const user = await createPlaylist(telegramId, name, description);
        res.json(user.playlists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/playlists/add', async (req, res) => {
    try {
        const { telegramId, playlistName, track } = req.body;
        const user = await addToPlaylist(telegramId, playlistName, track);
        res.json(user.playlists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/playlists/:telegramId', async (req, res) => {
    try {
        const user = await getUser(Number(req.params.telegramId));
        res.json(user?.playlists || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const tracks = await search(query);
        res.json(tracks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/top', async (req, res) => {
    try {
        const tracks = await getTopHits();
        res.json(tracks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/export/:telegramId', async (req, res) => {
    try {
        const user = await getUser(Number(req.params.telegramId));
        res.json(user || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('🌐 Web App server running on port 3000');
});

// ===== Headerlar =====
const DEFAULT_HEADERS = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "upgrade-insecure-requests": "1",
};

let FILE_HEADERS = {};
try {
    FILE_HEADERS = JSON.parse(await fs.readFile("./header.json", "utf8"));
} catch { }

const HEADERS = { ...DEFAULT_HEADERS, ...FILE_HEADERS };
const AUDIO_HEADERS = {
    ...HEADERS,
    referer: HEADERS.referer || `https://${BASE_URL}/`,
    origin: HEADERS.origin || `https://${BASE_URL}`,
};

// ===== Ko'p tillik =====
const LANGS = ["uz", "ru", "en"];
const userLang = new Map();

const I18N = {
    uz: {
        START: "🎵 <b>Musiqa Bot</b>\n\nQidirish uchun matn yuboring",
        HELP: "🔍 <b>Yordam</b>\n\n• Matn yozing - qidirish\n• /top - top hitlar\n• /lang - til\n• /app - Web App",
        ABOUT: "ℹ️ <b>Bot haqida</b>\n\nVersiya 3.0",
        LOADING_TOP: "⏳",
        SEARCHING: "🔍",
        TOP_TITLE: "⭐ TOP HITLAR",
        FAILED_TOP: "❌ Xatolik",
        FAILED_SEARCH: "❌ Xatolik",
        NOT_FOUND: "❌ Topilmadi",
        SENDING: (n) => `📤 ${n}`,
        SENDING_ALL: (k) => `📤 ${k} ta`,
        SEND_ERR: "❌ Xatolik",
        INVALID: "❌ Xato",
        LANG_PICK: "🌐 Til tanlang:",
        LANG_SET: (l) => `✅ ${l}`,
        BTN_ALL: "⬇️ All",
        TRACK_COUNT: (total, page, totalPages) => `${total} ta | ${page}/${totalPages}`,
        PROCESSING: "⚙️",
        SUCCESS: "✅ OK",
        OPEN_WEB_APP: "🌐 Ochish",
        WEB_APP_DESC: "To'liq musiqa pleer",
    },
    ru: {
        START: "🎵 <b>Music Bot</b>\n\nОтправьте текст для поиска",
        HELP: "🔍 <b>Помощь</b>\n\n• Текст - поиск\n• /top - топ\n• /lang - язык\n• /app - Web App",
        ABOUT: "ℹ️ <b>О боте</b>\n\nВерсия 3.0",
        LOADING_TOP: "⏳",
        SEARCHING: "🔍",
        TOP_TITLE: "⭐ ТОП",
        FAILED_TOP: "❌ Ошибка",
        FAILED_SEARCH: "❌ Ошибка",
        NOT_FOUND: "❌ Не найдено",
        SENDING: (n) => `📤 ${n}`,
        SENDING_ALL: (k) => `📤 ${k}`,
        SEND_ERR: "❌ Ошибка",
        INVALID: "❌ Ошибка",
        LANG_PICK: "🌐 Выберите язык:",
        LANG_SET: (l) => `✅ ${l}`,
        BTN_ALL: "⬇️ Все",
        TRACK_COUNT: (total, page, totalPages) => `${total} | ${page}/${totalPages}`,
        PROCESSING: "⚙️",
        SUCCESS: "✅ OK",
        OPEN_WEB_APP: "🌐 Открыть",
        WEB_APP_DESC: "Музыкальный плеер",
    },
    en: {
        START: "🎵 <b>Music Bot</b>\n\nSend text to search",
        HELP: "🔍 <b>Help</b>\n\n• Text - search\n• /top - top\n• /lang - language\n• /app - Web App",
        ABOUT: "ℹ️ <b>About</b>\n\nVersion 3.0",
        LOADING_TOP: "⏳",
        SEARCHING: "🔍",
        TOP_TITLE: "⭐ TOP",
        FAILED_TOP: "❌ Error",
        FAILED_SEARCH: "❌ Error",
        NOT_FOUND: "❌ Not found",
        SENDING: (n) => `📤 ${n}`,
        SENDING_ALL: (k) => `📤 ${k}`,
        SEND_ERR: "❌ Error",
        INVALID: "❌ Error",
        LANG_PICK: "🌐 Choose language:",
        LANG_SET: (l) => `✅ ${l}`,
        BTN_ALL: "⬇️ All",
        TRACK_COUNT: (total, page, totalPages) => `${total} | ${page}/${totalPages}`,
        PROCESSING: "⚙️",
        SUCCESS: "✅ OK",
        OPEN_WEB_APP: "🌐 Open",
        WEB_APP_DESC: "Music player",
    },
};

function getLang(ctx) {
    const id = ctx.from?.id;
    if (!id) return "en";
    return userLang.get(id) || "uz";
}

function t(ctx, key, ...args) {
    const lang = getLang(ctx);
    const val = I18N[lang][key];
    return typeof val === "function" ? val(...args) : val;
}

// ===== Chiroyli start xabari (Web App tugma bilan) =====
function formatStartMessage(ctx) {
    return `${t(ctx, "START")}\n\n/help - yordam`;
}

// ===== Qidiruv natijalari =====
function createTrackListMessage(ctx, keyword, tracks, page, isTop = false) {
    const totalPages = Math.max(Math.ceil(tracks.length / TRACKS_PER_PAGE) - 1, 0);
    const p = Math.min(Math.max(0, page), totalPages);
    const start = p * TRACKS_PER_PAGE;
    const end = Math.min(start + TRACKS_PER_PAGE, tracks.length);
    const pageTracks = tracks.slice(start, end);
    const totalTracks = tracks.length;

    let message = isTop ? `⭐ <b>${t(ctx, "TOP_TITLE")}</b>\n` : `🔍 <b>${keyword}</b>\n`;
    message += `📊 ${t(ctx, 'TRACK_COUNT', totalTracks, p + 1, totalPages + 1)}\n\n`;

    pageTracks.forEach((track, i) => {
        const trackNumber = start + i + 1;
        message += `${trackNumber}. ${track.name}\n`;
    });

    return message;
}

// ===== Xotira =====
let SEARCH_ID_SEQ = 1;
const searchStore = new Map();

// ===== Yuklab olish limiti =====
let activeDownloads = 0;
const waiters = [];

async function acquireSlot() {
    if (activeDownloads < MAX_PARALLEL_DOWNLOADS) {
        activeDownloads++;
        return;
    }
    await new Promise((resolve) => waiters.push(resolve));
    activeDownloads++;
}

function releaseSlot() {
    activeDownloads = Math.max(0, activeDownloads - 1);
    const next = waiters.shift();
    if (next) next();
}

// ===== Yordamchi funksiyalar =====
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function retry(fn, { attempts = 3, minDelay = 250, maxDelay = 1500 } = {}) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            await sleep(Math.min(maxDelay, minDelay * 2 ** i));
        }
    }
    throw lastErr;
}

async function fetchText(url, headers = HEADERS) {
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ctrl.signal, headers, redirect: "follow" });
        const html = await res.text();
        console.log("[FETCH]", res.status, res.url);

        if (!res.ok) {
            if (DEBUG_HTML) await fs.writeFile("./debug.html", html, "utf8").catch(() => { });
            throw new Error(`HTTP ${res.status} for ${url}`);
        }

        return html;
    } finally {
        clearTimeout(tmr);
    }
}

function cleanKeyword(keyword) {
    return String(keyword || "")
        .replace(/[^\w\s]/g, "")
        .trim()
        .toLowerCase();
}

function buildSearchQuery(keyword) {
    const cleaned = cleanKeyword(keyword);
    const query = cleaned.replace(/\s+/g, "-");
    return new URL(`https://${query}.${BASE_URL}`).href;
}

function parseTracksFromHtml(html) {
    const $ = cheerio.load(html);
    const playlist = $("ul.playlist");
    if (!playlist.length) throw new Error("Could not find playlist element");

    const tracks = [];
    playlist.find("li").each((i, el) => {
        const li = $(el);
        const performer = li.find(".playlist-name-artist").first().text().trim();
        const title = li.find(".playlist-name-title").first().text().trim();
        const audio_url = li.find(".playlist-play").first().attr("data-url") || "";

        if (!performer || !title || !audio_url) return;

        tracks.push({
            index: i,
            performer,
            title,
            name: `${performer} - ${title}`,
            audio_url: String(audio_url),
        });
    });
    return tracks;
}

async function parseTracks(url) {
    return retry(async () => {
        const html = await fetchText(url, HEADERS);
        if (DEBUG_HTML) await fs.writeFile("./last.html", html, "utf8").catch(() => { });
        return parseTracksFromHtml(html);
    });
}

async function getTopHits() {
    return parseTracks(`https://${BASE_URL}`);
}

async function search(keyword) {
    return parseTracks(buildSearchQuery(keyword));
}

// ===== Klaviatura =====
function createInlineKeyboard(ctx, searchId, page) {
    const entry = searchStore.get(searchId);
    if (!entry) return Markup.inlineKeyboard([[Markup.button.callback("❌", "noop")]]);

    const tracks = entry.tracks;
    const totalPages = Math.max(Math.ceil(tracks.length / TRACKS_PER_PAGE) - 1, 0);
    const p = Math.min(Math.max(0, page), totalPages);
    const start = p * TRACKS_PER_PAGE;
    const end = Math.min(start + TRACKS_PER_PAGE, tracks.length);
    const count = end - start;

    const row1 = [];
    const row2 = [];

    for (let n = 1; n <= 10; n++) {
        if (n > count) {
            (n <= 5 ? row1 : row2).push(Markup.button.callback("⬜", "noop"));
            continue;
        }
        const cb = `pick:${searchId}:${p}:${n}`;
        (n <= 5 ? row1 : row2).push(Markup.button.callback(String(n), cb));
    }

    const navRow = [
        Markup.button.callback("◀️", p > 0 ? `page:${searchId}:${p - 1}` : "noop"),
        Markup.button.callback(t(ctx, "BTN_ALL"), `all:${searchId}:${p}`),
        Markup.button.callback("▶️", p < totalPages ? `page:${searchId}:${p + 1}` : "noop"),
    ];

    return Markup.inlineKeyboard([row1, row2, navRow]);
}

// ===== Audio oqim =====
class ByteLimitTransform extends Transform {
    constructor(limit) {
        super();
        this.limit = limit;
        this.total = 0;
    }
    _transform(chunk, enc, cb) {
        this.total += chunk.length;
        if (this.total > this.limit) {
            cb(new Error(`File too large: > ${this.limit} bytes`));
            return;
        }
        cb(null, chunk);
    }
}

async function getAudioStream(url) {
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ctrl.signal, headers: AUDIO_HEADERS, redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for audio`);

        const lenStr = res.headers.get("content-length");
        if (lenStr) {
            const len = Number(lenStr);
            if (Number.isFinite(len) && len > MAX_FILE_SIZE) throw new Error(`File too large: ${len} bytes`);
        }

        if (!res.body) throw new Error("No audio body");

        const nodeStream = Readable.fromWeb(res.body);
        const limited = nodeStream.pipe(new ByteLimitTransform(MAX_FILE_SIZE));
        return { stream: limited, abort: () => ctrl.abort() };
    } finally {
        clearTimeout(tmr);
    }
}

async function sendOneTrack(ctx, track) {
    const statusMsg = await ctx.reply(`📤 ${track.name}`);

    await acquireSlot();
    try {
        await ctx.replyWithChatAction("upload_document");
        const { stream } = await retry(() => getAudioStream(track.audio_url), { attempts: 2 });

        await ctx.replyWithAudio(
            { source: stream, filename: `${track.name}.mp3` },
            {
                title: track.title,
                performer: track.performer,
                caption: `🎵 ${track.name}\n@${ctx.botInfo.username}`
            }
        );

        await ctx.telegram.deleteMessage(statusMsg.chat.id, statusMsg.message_id).catch(() => { });
    } catch (e) {
        console.log("[SEND ERROR]", String(e?.message || e));
        await ctx.telegram.editMessageText(
            statusMsg.chat.id,
            statusMsg.message_id,
            undefined,
            `❌ ${track.name}`
        );
    } finally {
        releaseSlot();
    }
}

// ===== Telegram bot =====
const bot = new Telegraf(BOT_TOKEN);

// Connect to MongoDB
connectDB().then(() => {
    console.log('✅ Database connected');
});

// Tilni o'zgartirish
bot.command("lang", async (ctx) => {
    const buttons = LANGS.map(l =>
        Markup.button.callback(l.toUpperCase(), `lang:${l}`)
    );

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 3 });
    await ctx.reply(t(ctx, "LANG_PICK"), keyboard);
});

bot.action(/^lang:(uz|ru|en)$/, async (ctx) => {
    const l = ctx.match[1];
    const id = ctx.from?.id;
    if (id) {
        userLang.set(id, l);
        await createOrUpdateUser(id, { language: l });
    }

    await ctx.answerCbQuery(`✅ ${l.toUpperCase()}`);
    await ctx.editMessageText(t(ctx, "LANG_SET", l.toUpperCase()));
});

// Start komandasi (Web App tugma bilan)
bot.start(async (ctx) => {
    const user = ctx.from;
    if (user) {
        await createOrUpdateUser(user.id, {
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username
        });
    }

    const webAppUrl = `${WEB_APP_URL}?user=${ctx.from.id}`;

    await ctx.reply(formatStartMessage(ctx), {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[
                Markup.button.webApp(t(ctx, "OPEN_WEB_APP"), webAppUrl)
            ]]
        }
    });
});

// Help komandasi
bot.command("help", async (ctx) => {
    await ctx.reply(t(ctx, "HELP"), { parse_mode: "HTML" });
});

// About komandasi
bot.command("about", async (ctx) => {
    await ctx.reply(t(ctx, "ABOUT"), { parse_mode: "HTML" });
});

// Web App komandasi
bot.command("app", async (ctx) => {
    const webAppUrl = `${WEB_APP_URL}?user=${ctx.from.id}`;

    await ctx.reply(t(ctx, "WEB_APP_DESC"), {
        reply_markup: {
            inline_keyboard: [[
                Markup.button.webApp(t(ctx, "OPEN_WEB_APP"), webAppUrl)
            ]]
        }
    });
});

// Top komandasi
bot.command("top", async (ctx) => {
    const msg = await ctx.reply(t(ctx, "LOADING_TOP"));

    try {
        const tracks = await getTopHits();
        const searchId = SEARCH_ID_SEQ++;
        searchStore.set(searchId, {
            keyword: t(ctx, "TOP_TITLE"),
            tracks,
            createdAt: Date.now(),
            page: 0
        });

        const text = createTrackListMessage(ctx, t(ctx, "TOP_TITLE"), tracks, 0, true);
        const keyboard = createInlineKeyboard(ctx, searchId, 0);

        await ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            undefined,
            text,
            keyboard
        );
    } catch (e) {
        console.log("[TOP ERROR]", String(e?.message || e));
        await ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            undefined,
            t(ctx, "FAILED_TOP")
        );
    }
});

// Matn qidirish
bot.on("text", async (ctx) => {
    const keyword = String(ctx.message.text || "").trim();
    if (!keyword || keyword.length > 100) {
        return ctx.reply(t(ctx, "INVALID"));
    }

    const msg = await ctx.reply(t(ctx, "SEARCHING", keyword));

    try {
        const tracks = await search(keyword);

        if (tracks.length === 0) {
            return await ctx.telegram.editMessageText(
                msg.chat.id,
                msg.message_id,
                undefined,
                t(ctx, "NOT_FOUND")
            );
        }

        const searchId = SEARCH_ID_SEQ++;
        searchStore.set(searchId, {
            keyword,
            tracks,
            createdAt: Date.now(),
            page: 0
        });

        const text = createTrackListMessage(ctx, keyword, tracks, 0);
        const keyboard = createInlineKeyboard(ctx, searchId, 0);

        await ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            undefined,
            text,
            keyboard
        );
    } catch (e) {
        console.log("[SEARCH ERROR]", String(e?.message || e));
        await ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            undefined,
            t(ctx, "FAILED_SEARCH")
        );
    }
});

// Sahifalash
bot.action(/^page:(\d+):(\d+)$/, async (ctx) => {
    try {
        const searchId = Number(ctx.match[1]);
        const page = Number(ctx.match[2]);
        const entry = searchStore.get(searchId);

        if (!entry) {
            return ctx.answerCbQuery(t(ctx, "NOT_FOUND"));
        }

        entry.page = page;
        const text = createTrackListMessage(ctx, entry.keyword, entry.tracks, page, entry.keyword === I18N[getLang(ctx)].TOP_TITLE);
        const keyboard = createInlineKeyboard(ctx, searchId, page);

        await ctx.editMessageText(text, keyboard);
        await ctx.answerCbQuery(`📄 ${page + 1}`);
    } catch (e) {
        console.log("[PAGE ERROR]", e);
        await ctx.answerCbQuery("❌");
    }
});

// Bo'sh tugma
bot.action("noop", async (ctx) => ctx.answerCbQuery());

// Trekni tanlash
bot.action(/^pick:(\d+):(\d+):(\d+)$/, async (ctx) => {
    const searchId = Number(ctx.match[1]);
    const page = Number(ctx.match[2]);
    const n = Number(ctx.match[3]);

    const entry = searchStore.get(searchId);
    if (!entry) return ctx.answerCbQuery(t(ctx, "NOT_FOUND"));

    const globalIndex = page * TRACKS_PER_PAGE + (n - 1);
    const track = entry.tracks[globalIndex];
    if (!track) return ctx.answerCbQuery(t(ctx, "NOT_FOUND"));

    await ctx.answerCbQuery(`📥 ${n}`);
    await sendOneTrack(ctx, track);
});

// Hammasini yuborish
bot.action(/^all:(\d+):(\d+)$/, async (ctx) => {
    const searchId = Number(ctx.match[1]);
    const page = Number(ctx.match[2]);

    const entry = searchStore.get(searchId);
    if (!entry) return ctx.answerCbQuery(t(ctx, "NOT_FOUND"));

    const start = page * TRACKS_PER_PAGE;
    const end = Math.min(start + TRACKS_PER_PAGE, entry.tracks.length);
    const pageTracks = entry.tracks.slice(start, end);

    await ctx.answerCbQuery(`📥 ${pageTracks.length}`);

    const statusMsg = await ctx.reply(t(ctx, "SENDING_ALL", pageTracks.length));

    let successCount = 0;
    for (const track of pageTracks) {
        try {
            await sendOneTrack(ctx, track);
            successCount++;
        } catch (e) {
            console.log("[SEND ALL ERROR]", String(e?.message || e));
        }
    }

    await ctx.telegram.editMessageText(
        statusMsg.chat.id,
        statusMsg.message_id,
        undefined,
        `${t(ctx, "SUCCESS")} ${successCount}/${pageTracks.length}`
    );
});

// Web app ma'lumotlarini qabul qilish
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data);

        if (data.action === 'send_track' && data.track) {
            await sendOneTrack(ctx, data.track);
        }
    } catch (error) {
        console.error('Web app data error:', error);
    }
});

// Eski xabarlarni tozalash
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, data] of searchStore.entries()) {
        if (data.createdAt < oneHourAgo) {
            searchStore.delete(id);
        }
    }
}, 1800000);

// Botni ishga tushirish
bot.launch().then(() => {
    console.log("🚀 Bot ishga tushdi!");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));