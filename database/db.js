import mongoose from "mongoose";
import User from "./models/User.js";

/* ───────────────────────── Connection ───────────────────────── */

export async function connectDB() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/music-bot";

    mongoose.connection.removeAllListeners(); // hot-reload/nodemon uchun

    mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
    mongoose.connection.on("disconnected", () => console.log("⚠️  MongoDB disconnected"));
    mongoose.connection.on("error", (e) => console.error("❌ MongoDB error:", e));

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
}

/* ───────────────────────── Internals ───────────────────────── */

function requireTelegramId(telegramId) {
    if (telegramId === undefined || telegramId === null) {
        throw new Error("telegramId is required");
    }
    const tgId = String(telegramId).trim();
    if (!tgId || tgId === "undefined" || tgId === "null" || tgId === "NaN") {
        throw new Error(`Invalid telegramId: ${telegramId}`);
    }
    return tgId;
}

// Unicode-safe, stable trackId (lotin/kirill ham ishlaydi)
function buildTrackId(performer = "", title = "") {
    const base = `${performer} ${title}`.trim().toLowerCase();
    // harf/raqamdan boshqa hammasini olib tashlaymiz
    return base.replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeTrack(track) {
    const performer = String(track?.performer ?? "").trim();
    const title = String(track?.title ?? "").trim();
    const name = String(track?.name ?? `${performer} - ${title}`.trim()).trim();

    const audio_url = track?.audio_url ? String(track.audio_url).trim() : "";

    if (!performer || !title) {
        throw new Error("Invalid track: performer and title are required");
    }

    return {
        trackId: buildTrackId(performer, title),
        performer,
        title,
        name,
        audio_url,
    };
}

const AFTER = { returnDocument: "after" };

/* ───────────────────────── User CRUD ───────────────────────── */

export async function getUser(telegramId) {
    const tgId = requireTelegramId(telegramId);
    return User.findOne({ telegramId: tgId }).lean();
}

export async function createOrUpdateUser(telegramId, data = {}) {
    const tgId = requireTelegramId(telegramId);

    // data ni xavfsiz ko‘rinishga keltirish
    const safeData = typeof data === "object" && data ? data : {};

    return User.findOneAndUpdate(
        { telegramId: tgId },
        { $set: { ...safeData, telegramId: tgId, lastActive: new Date() } },
        { ...AFTER, upsert: true }
    ).lean();
}

/* ───────────────────────── Favorites ───────────────────────── */

export async function addToFavorites(telegramId, track) {
    const tgId = requireTelegramId(telegramId);
    const normalized = normalizeTrack(track);

    return User.findOneAndUpdate(
        { telegramId: tgId, "favorites.trackId": { $ne: normalized.trackId } },
        { $push: { favorites: { ...normalized, addedAt: new Date() } } },
        { ...AFTER, upsert: true }
    ).lean();
}

export async function removeFromFavorites(telegramId, trackId) {
    const tgId = requireTelegramId(telegramId);
    const id = String(trackId ?? "").trim();
    if (!id) throw new Error("trackId is required");

    return User.findOneAndUpdate(
        { telegramId: tgId },
        { $pull: { favorites: { trackId: id } } },
        { ...AFTER, upsert: true }
    ).lean();
}

/* ─────────────────────── Recently Played ────────────────────── */

export async function addToRecentlyPlayed(telegramId, track) {
    const tgId = requireTelegramId(telegramId);
    const normalized = normalizeTrack(track);

    // oldini o‘chirib, keyin boshiga qo‘shamiz
    await User.updateOne(
        { telegramId: tgId },
        { $pull: { recentlyPlayed: { trackId: normalized.trackId } } },
        { upsert: true } // user bo‘lmasa ham yaratib yuborsin
    );

    return User.findOneAndUpdate(
        { telegramId: tgId },
        {
            $push: {
                recentlyPlayed: {
                    $each: [{ ...normalized, addedAt: new Date() }],
                    $position: 0,
                    $slice: 50,
                },
            },
            $set: { lastActive: new Date() },
        },
        { ...AFTER, upsert: true }
    ).lean();
}

/* ───────────────────────── Playlists ───────────────────────── */

function requirePlaylistName(name) {
    const n = String(name ?? "").trim();
    if (!n) throw new Error("playlist name is required");
    if (n.length > 64) throw new Error("playlist name too long");
    return n;
}

export async function createPlaylist(telegramId, name, description = "") {
    const tgId = requireTelegramId(telegramId);
    const playlistName = requirePlaylistName(name);
    const desc = String(description ?? "").trim().slice(0, 256);

    // atomic check+insert: duplicates oldini oladi
    const res = await User.findOneAndUpdate(
        { telegramId: tgId, "playlists.name": { $ne: playlistName } },
        {
            $push: {
                playlists: { name: playlistName, description: desc, tracks: [], createdAt: new Date() },
            },
            $set: { lastActive: new Date() },
        },
        { ...AFTER, upsert: true }
    ).lean();

    // Agar oldin bor bo‘lsa, update bo‘lmaydi va res null bo‘lishi mumkin (schema/behaviorga qarab)
    // Shu holatni aniq tutamiz:
    const exists = await User.findOne({ telegramId: tgId, "playlists.name": playlistName }).lean();
    if (!exists) throw new Error("PLAYLIST_CREATE_FAILED");

    // Agar playlist avval bor bo‘lsa, yuqoridagi update playlist qo‘shmaydi.
    // Buni semantik error bilan qaytaramiz:
    const already = await User.findOne({ telegramId: tgId, "playlists.name": playlistName }).lean();
    if (already && (!res || already.playlists?.some(p => p.name === playlistName) && res?.playlists?.length === already.playlists?.length)) {
        // bu qism “exists” detection uchun qo‘pol; oddiy yo‘l:
        // 1) avval findOne bilan tekshirish, 2) keyin push
        // lekin concurrency’da duplicates bo‘lishi mumkin.
    }

    // Amaliy: oddiy “exists check” qaytarish:
    // Agar res null bo‘lsa => playlist allaqachon bor
    if (!res) throw new Error("PLAYLIST_EXISTS");

    return res;
}

export async function addToPlaylist(telegramId, playlistName, track) {
    const tgId = requireTelegramId(telegramId);
    const pName = requirePlaylistName(playlistName);
    const normalized = normalizeTrack(track);

    const updated = await User.findOneAndUpdate(
        {
            telegramId: tgId,
            "playlists.name": pName,
            "playlists.tracks.trackId": { $ne: normalized.trackId },
        },
        {
            $push: { "playlists.$.tracks": { ...normalized, addedAt: new Date() } },
            $set: { lastActive: new Date() },
        },
        { ...AFTER, upsert: true }
    ).lean();

    // playlist yo‘q bo‘lsa user yaratilib ketishi mumkin, lekin playlist bo‘lmaydi.
    // Shuni aniq error qilamiz:
    const hasPlaylist = await User.findOne({ telegramId: tgId, "playlists.name": pName }).lean();
    if (!hasPlaylist) throw new Error("PLAYLIST_NOT_FOUND");

    return updated;
}

export async function deletePlaylist(telegramId, playlistName) {
    const tgId = requireTelegramId(telegramId);
    const pName = requirePlaylistName(playlistName);

    return User.findOneAndUpdate(
        { telegramId: tgId },
        { $pull: { playlists: { name: pName } }, $set: { lastActive: new Date() } },
        { ...AFTER, upsert: true }
    ).lean();
}