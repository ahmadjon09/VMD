import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { connectDB } from '../database/db.js';
import { createApp, errorHandler } from './api/routes.js';
import { registerCommands } from './bot/handlers.js';
import axios from 'axios';
// ─── Validate required env vars ───────────────────────────────
const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN env variable is required');

const PORT = Number(process.env.PORT || 3000);

// ─── Express ──────────────────────────────────────────────────
const app = createApp();
app.use(errorHandler);
app.listen(PORT, () => console.log(`🌐 API server on port ${PORT}`));

// ─── MongoDB ──────────────────────────────────────────────────
await connectDB();

// ─── Telegram Bot ─────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

registerCommands(bot);

// Global error guard — prevent crashes on unhandled rejections
bot.catch((err, ctx) => {
    console.error('[Bot Error]', err.message, ctx?.updateType);
});

await bot.launch();
console.log('🚀 Bot started!');

const keepServerAlive = () => {
    if (!process.env.BASE_URL) {
        console.warn('⚠️ BASE_URL is not set. Skipping ping.')
        return
    }

    setInterval(() => {
        axios
            .get(`${process.env.WEB_APP_URL}/ac`)
            .then(() => console.log('🔄 Server active'))
            .catch(err => console.log('⚠️ Ping failed:', err.message))
    }, 10 * 60 * 1000)
}
keepServerAlive()
// ─── Graceful shutdown ────────────────────────────────────────
process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });