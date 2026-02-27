import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/music-bot';

export async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

export async function getUser(telegramId) {
    return await User.findOne({ telegramId });
}

export async function createOrUpdateUser(telegramId, userData) {
    return await User.findOneAndUpdate(
        { telegramId },
        { ...userData, lastActive: Date.now() },
        { upsert: true, new: true }
    );
}

export async function addToFavorites(telegramId, track) {
    return await User.findOneAndUpdate(
        { telegramId },
        {
            $addToSet: {
                favorites: {
                    ...track,
                    trackId: `${track.performer}-${track.title}`.replace(/[^a-zA-Z0-9]/g, ''),
                    addedAt: new Date()
                }
            }
        },
        { new: true }
    );
}

export async function removeFromFavorites(telegramId, trackId) {
    return await User.findOneAndUpdate(
        { telegramId },
        { $pull: { favorites: { trackId } } },
        { new: true }
    );
}

export async function addToRecentlyPlayed(telegramId, track) {
    return await User.findOneAndUpdate(
        { telegramId },
        {
            $push: {
                recentlyPlayed: {
                    $each: [{
                        ...track,
                        trackId: `${track.performer}-${track.title}`.replace(/[^a-zA-Z0-9]/g, ''),
                        playedAt: new Date()
                    }],
                    $slice: -50
                }
            }
        },
        { new: true }
    );
}

export async function createPlaylist(telegramId, name, description = '') {
    return await User.findOneAndUpdate(
        { telegramId },
        { $push: { playlists: { name, description, tracks: [] } } },
        { new: true }
    );
}

export async function addToPlaylist(telegramId, playlistName, track) {
    return await User.findOneAndUpdate(
        {
            telegramId,
            'playlists.name': playlistName
        },
        {
            $push: {
                'playlists.$.tracks': {
                    ...track,
                    trackId: `${track.performer}-${track.title}`.replace(/[^a-zA-Z0-9]/g, ''),
                    addedAt: new Date()
                }
            }
        },
        { new: true }
    );
}