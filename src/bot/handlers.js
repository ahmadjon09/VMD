import { Markup } from 'telegraf';
import { t, setLang, LANGS, getLang } from '../utils/i18n.js';
import { searchStore } from '../utils/searchStore.js';
import { buildResultMessage, buildKeyboard, TRACKS_PER_PAGE } from '../utils/keyboard.js';
import { getTopHits, searchTracks, getAudioStream } from '../services/scraper.js';
import { DownloadQueue } from '../utils/queue.js';
import {
    createOrUpdateUser,
    addToRecentlyPlayed,
} from '../../database/db.js';

const MAX_PARALLEL = Number(process.env.MAX_PARALLEL_DOWNLOADS || 5);
const dlQueue = new DownloadQueue(MAX_PARALLEL);
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-domain.com';

// ─── Internal helpers ─────────────────────────────────────────
function uid(ctx) {
    return ctx.from?.id;
}

async function editOrReply(ctx, msgId, text, extra = {}) {
    try {
        await ctx.telegram.editMessageText(
            ctx.chat.id, msgId, undefined, text,
            { parse_mode: 'HTML', ...extra },
        );
    } catch {
        await ctx.reply(text, { parse_mode: 'HTML', ...extra });
    }
}

async function sendTrack(ctx, track) {
    const userId = uid(ctx);
    const statusMsg = await ctx.reply(t(userId, 'DOWNLOAD_START', track.name), { parse_mode: 'HTML' });

    await dlQueue.run(async () => {
        try {
            await ctx.replyWithChatAction('upload_document');
            const stream = await getAudioStream(track.audio_url);

            await ctx.replyWithAudio(
                { source: stream, filename: `${track.name}.mp3` },
                {
                    title: track.title,
                    performer: track.performer,
                    caption: `🎵 <b>${track.name}</b>\n\n🔍 @${ctx.botInfo.username}`,
                    parse_mode: 'HTML',
                },
            );

            // Track recently played (non-blocking)
            addToRecentlyPlayed(userId, track).catch(() => { });

            await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => { });
        } catch (e) {
            console.error('[sendTrack]', e.message);
            await ctx.telegram.editMessageText(
                ctx.chat.id, statusMsg.message_id, undefined,
                t(userId, 'DOWNLOAD_ERROR', track.name),
                { parse_mode: 'HTML' },
            ).catch(() => { });
        }
    });
}

function showResults(ctx, keyword, tracks, page, isTop = false) {
    const userId = uid(ctx);
    const searchId = searchStore.save(keyword, tracks);
    const { text, totalPages, count } = buildResultMessage(userId, t, keyword, tracks, page, isTop);
    const keyboard = buildKeyboard(searchId, page, count, totalPages, t(userId, 'BTN_ALL'));
    return { text, keyboard, searchId };
}

// ─── Command Handlers ─────────────────────────────────────────
export function registerCommands(bot) {

    // /start
    bot.start(async (ctx) => {
        const user = ctx.from;
        if (user) {
            setLang(user.id, getLang(user.id));   // ensure cache populated
            createOrUpdateUser(user.id, {
                firstName: user.first_name ?? '',
                lastName: user.last_name ?? '',
                username: user.username ?? '',
            }).catch(() => { });
        }

        const name = user?.first_name ?? user?.username ?? 'User';
        const url = `${WEB_APP_URL}?user=${user?.id ?? 0}`;

        await ctx.reply(t(uid(ctx), 'WELCOME', name), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    Markup.button.webApp(t(uid(ctx), 'OPEN_APP'), url),
                ]],
            },
        });
    });

    // /help
    bot.command('help', (ctx) =>
        ctx.reply(t(uid(ctx), 'HELP'), { parse_mode: 'HTML' }));

    // /about
    bot.command('about', (ctx) =>
        ctx.reply(t(uid(ctx), 'ABOUT'), { parse_mode: 'HTML' }));

    // /app
    bot.command('app', (ctx) => {
        const url = `${WEB_APP_URL}?user=${uid(ctx) ?? 0}`;
        return ctx.reply(t(uid(ctx), 'APP_DESC'), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    Markup.button.webApp(t(uid(ctx), 'OPEN_APP'), url),
                ]],
            },
        });
    });

    // /lang
    bot.command('lang', (ctx) => {
        const flags = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' };
        const buttons = LANGS.map((l) =>
            Markup.button.callback(`${flags[l]} ${l.toUpperCase()}`, `lang:${l}`));
        return ctx.reply(t(uid(ctx), 'LANG_PICK'), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons, { columns: 3 }),
        });
    });

    // /top
    bot.command('top', async (ctx) => {
        const msg = await ctx.reply(t(uid(ctx), 'LOADING_TOP'), { parse_mode: 'HTML' });
        try {
            const tracks = await getTopHits();
            const { text, keyboard } = showResults(ctx, t(uid(ctx), 'TOP_TITLE'), tracks, 0, true);
            await editOrReply(ctx, msg.message_id, text, keyboard);
        } catch (e) {
            console.error('[/top]', e.message);
            await editOrReply(ctx, msg.message_id, t(uid(ctx), 'FAILED_TOP'));
        }
    });

    // ─── Text search ──────────────────────────────────────────
    bot.on('text', async (ctx) => {
        const keyword = ctx.message.text?.trim();
        if (!keyword || keyword.startsWith('/') || keyword.length > 100) {
            return ctx.reply(t(uid(ctx), 'INVALID'), { parse_mode: 'HTML' });
        }

        const msg = await ctx.reply(t(uid(ctx), 'SEARCHING', keyword), { parse_mode: 'HTML' });
        try {
            const tracks = await searchTracks(keyword);
            if (!tracks.length) {
                return editOrReply(ctx, msg.message_id, t(uid(ctx), 'NOT_FOUND'));
            }
            const { text, keyboard } = showResults(ctx, keyword, tracks, 0);
            await editOrReply(ctx, msg.message_id, text, keyboard);
        } catch (e) {
            console.error('[search]', e.message);
            await editOrReply(ctx, msg.message_id, t(uid(ctx), 'FAILED_SEARCH'));
        }
    });

    // ─── Callback actions ─────────────────────────────────────

    // Language select
    bot.action(/^lang:(uz|ru|en)$/, async (ctx) => {
        const lang = ctx.match[1];
        const userId = uid(ctx);
        setLang(userId, lang);
        createOrUpdateUser(userId, { language: lang }).catch(() => { });

        const names = { uz: '🇺🇿 O\'zbek', ru: '🇷🇺 Русский', en: '🇬🇧 English' };
        await ctx.answerCbQuery(`✅ ${names[lang]}`);
        await ctx.editMessageText(t(userId, 'LANG_SET', names[lang]), { parse_mode: 'HTML' });
    });

    // Pagination
    bot.action(/^page:(\d+):(\d+)$/, async (ctx) => {
        const searchId = Number(ctx.match[1]);
        const page = Number(ctx.match[2]);
        const entry = searchStore.get(searchId);
        const userId = uid(ctx);

        if (!entry) return ctx.answerCbQuery('❌');

        const { text, totalPages, count } = buildResultMessage(userId, t, entry.keyword, entry.tracks, page);
        const keyboard = buildKeyboard(searchId, page, count, totalPages, t(userId, 'BTN_ALL'));

        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
        await ctx.answerCbQuery(`📄 ${page + 1}`);
    });

    // No-op (disabled buttons)
    bot.action('noop', (ctx) => ctx.answerCbQuery());

    // Pick single track
    bot.action(/^pick:(\d+):(\d+):(\d+)$/, async (ctx) => {
        const [, sId, page, n] = ctx.match.map(Number);
        const entry = searchStore.get(sId);
        const userId = uid(ctx);

        if (!entry) return ctx.answerCbQuery('❌');

        const track = entry.tracks[page * TRACKS_PER_PAGE + (n - 1)];
        if (!track) return ctx.answerCbQuery('❌');

        await ctx.answerCbQuery(`📥 ${n}`);
        await sendTrack(ctx, track);
    });

    // Download all on page
    bot.action(/^all:(\d+):(\d+)$/, async (ctx) => {
        const [, sId, page] = ctx.match.map(Number);
        const entry = searchStore.get(sId);
        const userId = uid(ctx);

        if (!entry) return ctx.answerCbQuery('❌');

        const start = page * TRACKS_PER_PAGE;
        const slice = entry.tracks.slice(start, start + TRACKS_PER_PAGE);

        await ctx.answerCbQuery(`📥 ${slice.length}`);
        const statusMsg = await ctx.reply(t(userId, 'SENDING_ALL', slice.length), { parse_mode: 'HTML' });

        let ok = 0;
        for (const track of slice) {
            try { await sendTrack(ctx, track); ok++; }
            catch (e) { console.error('[all send]', e.message); }
        }

        await ctx.telegram.editMessageText(
            ctx.chat.id, statusMsg.message_id, undefined,
            t(userId, 'SUCCESS', ok, slice.length),
            { parse_mode: 'HTML' },
        ).catch(() => { });
    });

    // Web App data
    bot.on('web_app_data', async (ctx) => {
        try {
            const data = JSON.parse(ctx.webAppData.data);
            if (data.action === 'send_track' && data.track) {
                await sendTrack(ctx, data.track);
            }
        } catch (e) {
            console.error('[web_app_data]', e.message);
        }
    });
}