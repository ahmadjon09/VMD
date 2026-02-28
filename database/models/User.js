import mongoose from 'mongoose';

const TrackSchema = new mongoose.Schema({
    trackId: { type: String, required: true },
    performer: { type: String, required: true },
    title: { type: String, required: true },
    name: { type: String, required: true },
    audio_url: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
}, { _id: false });

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    tracks: { type: [TrackSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true,},
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    language: { type: String, enum: ['uz', 'ru', 'en'], default: 'uz' },
    favorites: { type: [TrackSchema], default: [] },
    recentlyPlayed: { type: [TrackSchema], default: [] },
    playlists: { type: [PlaylistSchema], default: [] },
    lastActive: { type: Date, default: Date.now },
}, {
    timestamps: true,
    versionKey: false,
});

export default mongoose.model('User', UserSchema);