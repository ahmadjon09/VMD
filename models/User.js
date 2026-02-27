import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    firstName: String,
    lastName: String,
    username: String,
    language: { type: String, default: 'uz' },

    // Favourites
    favorites: [{
        trackId: String,
        title: String,
        performer: String,
        audioUrl: String,
        addedAt: { type: Date, default: Date.now }
    }],

    // Playlists
    playlists: [{
        name: String,
        description: String,
        tracks: [{
            trackId: String,
            title: String,
            performer: String,
            audioUrl: String,
            addedAt: { type: Date, default: Date.now }
        }],
        createdAt: { type: Date, default: Date.now }
    }],

    // Recently played
    recentlyPlayed: [{
        trackId: String,
        title: String,
        performer: String,
        audioUrl: String,
        playedAt: { type: Date, default: Date.now }
    }],

    // Settings
    settings: {
        autoPlay: { type: Boolean, default: false },
        quality: { type: String, default: 'medium' },
        theme: { type: String, default: 'dark' }
    },

    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});


userSchema.pre('save', function (next) {
    if (this.recentlyPlayed.length > 50) {
        this.recentlyPlayed = this.recentlyPlayed.slice(-50);
    }
    next();
});

export default mongoose.model('User', userSchema);