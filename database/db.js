import mongoose from 'mongoose';
import User from './models/User.js';

// ─── Connection ───────────────────────────────────────────────
export async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/music-bot';

    mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
    mongoose.connection.on('disconnected', () => console.log('⚠️  MongoDB disconnected'));
    mongoose.connection.on('error', (e) => console.error('❌ MongoDB error:', e));

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
}

// ─── Helpers ──────────────────────────────────────────────────
function buildTrackId(performer, title) {
    return `${performer}-${title}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeTrack(track) {
    return {
        trackId: buildTrackId(track.performer, track.title),
        performer: track.performer,
        title: track.title,
        name: track.name,
        audio_url: track.audio_url,
    };
}

// ─── User CRUD ────────────────────────────────────────────────
export async function getUser(telegramId) {
    return User.findOne({ telegramId }).lean();
}

export async function createOrUpdateUser(telegramId, data) {
    return User.findOneAndUpdate(
        { telegramId },
        { ...data, lastActive: new Date() },
        { upsert: true, returnDocument: 'after', upsert: true },
    ).lean();
}

// ─── Favorites ────────────────────────────────────────────────
export async function addToFavorites(telegramId, track) {
    const normalized = normalizeTrack(track);
    return User.findOneAndUpdate(
        { telegramId, 'favorites.trackId': { $ne: normalized.trackId } },
        { $push: { favorites: { ...normalized, addedAt: new Date() } } },
        { returnDocument: 'after', upsert: true },
    ).lean();
}

export async function removeFromFavorites(telegramId, trackId) {
    return User.findOneAndUpdate(
        { telegramId },
        { $pull: { favorites: { trackId } } },
        { returnDocument: 'after', upsert: true },
    ).lean();
}

// ─── Recently Played ──────────────────────────────────────────
export async function addToRecentlyPlayed(telegramId, track) {
    const normalized = normalizeTrack(track);
    await User.updateOne(
        { telegramId },
        { $pull: { recentlyPlayed: { trackId: normalized.trackId } } },
    );
    return User.findOneAndUpdate(
        { telegramId },
        {
            $push: {
                recentlyPlayed: {
                    $each: [{ ...normalized, addedAt: new Date() }],
                    $position: 0,
                    $slice: 50,
                },
            },
        },
        { new: true, upsert: true },
    ).lean();
}

// ─── Playlists ────────────────────────────────────────────────
export async function createPlaylist(telegramId, name, description = '') {
    const exists = await User.findOne({ telegramId, 'playlists.name': name });
    if (exists) throw new Error('PLAYLIST_EXISTS');

    return User.findOneAndUpdate(
        { telegramId },
        { $push: { playlists: { name, description, tracks: [], createdAt: new Date() } } },
        { new: true, upsert: true },
    ).lean();
}

export async function addToPlaylist(telegramId, playlistName, track) {
    const normalized = normalizeTrack(track);
    return User.findOneAndUpdate(
        {
            telegramId,
            'playlists.name': playlistName,
            'playlists.tracks.trackId': { $ne: normalized.trackId },
        },
        {
            $push: {
                'playlists.$.tracks': { ...normalized, addedAt: new Date() },
            },
        },
        { returnDocument: 'after', upsert: true },
    ).lean();
}

export async function deletePlaylist(telegramId, playlistName) {
    return User.findOneAndUpdate(
        { telegramId },
        { $pull: { playlists: { name: playlistName } } },
        { returnDocument: 'after', upsert: true },
    ).lean();
}