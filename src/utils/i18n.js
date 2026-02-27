// ─── Supported languages ──────────────────────────────────────
export const LANGS = ['uz', 'ru', 'en'];

export const I18N = {
    uz: {
        WELCOME: (name) => `✨ <b>Assalomu alaykum, ${name}!</b>\n\n🎵 <b>VMD-bot</b> ga xush kelibsiz!\nQo'shiq nomini yozing va yuklab oling 🎧`,
        START: '🎵 <b>VMD-bot</b>\n\nQo\'shiq nomini yozing — biz topamiz!',
        HELP: '🔍 <b>YORDAM</b>\n\n📝 <b>Buyruqlar:</b>\n• Matn → musiqa qidirish\n• /top → top 50 qo\'shiq\n• /lang → tilni o\'zgartirish\n• /app → Web Appni ochish\n• /about → bot haqida\n\n💡 Raqam tugmasini bosing — qo\'shiq yuklanadi\n⬇️ «Hammasi» tugmasi — sahifadagi barcha qo\'shiqlar',
        ABOUT: 'ℹ️ <b>BOT HAQIDA</b>\n\n📌 Versiya: 3.0\n🎵 Platforma: Telegram\n⚡ Tezlik: Maksimal',
        LOADING_TOP: '⏳',
        SEARCHING: (kw) => `🔍`,
        TOP_TITLE: '⭐ TOP 50',
        FAILED_TOP: '❌ <b>Xatolik.</b> Qaytadan urinib ko\'ring: /top',
        FAILED_SEARCH: '❌ <b>Qidiruvda xatolik.</b> Qaytadan urinib ko\'ring.',
        NOT_FOUND: '🔇 <b>Hech narsa topilmadi.</b>\n\nBoshqa so\'z bilan qidiring.',
        INVALID: '❌ So\'rov juda uzun yoki bo\'sh.',
        LANG_PICK: '🌐 <b>TILNI TANLANG</b>',
        LANG_SET: (l) => `✅ Til o\'zgartirildi: <b>${l}</b>`,
        BTN_ALL: '⬇️ Hammasi',
        TRACK_COUNT: (total, page, pages) => `🎵 <b>${total}</b> ta | 📄 ${page}/${pages}`,
        PROCESSING: '⚙️ <i>Ishlov berilmoqda…</i>',
        SUCCESS: (ok, total) => `✅ Yuborildi: <b>${ok}/${total}</b>`,
        DOWNLOAD_START: (name) => `⬇️ Yuklanmoqda: <i>${name}</i>`,
        DOWNLOAD_ERROR: (name) => `❌ Yuklab bo\'lmadi: <i>${name}</i>`,
        OPEN_APP: '🌐 Web Appni ochish',
        APP_DESC: '🌐 <b>WEB APP</b>\n\nTo\'liq funksiyali musiqa pleer:\n• Sevimlilar  • Playlistlar\n• So\'nggi tinglanganlar  • Yuklab olish',
        SENDING_ALL: (k) => `📤 <i>${k} ta qo\'shiq yuborilmoqda…</i>`,
    },

    ru: {
        WELCOME: (name) => `✨ <b>Здравствуйте, ${name}!</b>\n\n🎵 Добро пожаловать в <b>VMD-bot</b>!\nНапишите название — и скачайте музыку 🎧`,
        START: '🎵 <b>VMD-bot</b>\n\nОтправьте название трека — мы найдём!',
        HELP: '🔍 <b>ПОМОЩЬ</b>\n\n📝 <b>Команды:</b>\n• Текст → поиск музыки\n• /top → топ 50\n• /lang → язык\n• /app → Web App\n• /about → о боте\n\n💡 Нажмите цифру — трек скачается\n⬇️ «Все» — все треки на странице',
        ABOUT: 'ℹ️ <b>О БОТЕ</b>\n\n📌 Версия: 3.0\n🎵 Платформа: Telegram\n⚡ Скорость: Максимальная',
        LOADING_TOP: '⏳',
        SEARCHING: (kw) => `🔍`,
        TOP_TITLE: '⭐ ТОП 50',
        FAILED_TOP: '❌ <b>Ошибка.</b> Попробуйте снова: /top',
        FAILED_SEARCH: '❌ <b>Ошибка поиска.</b> Попробуйте другой запрос.',
        NOT_FOUND: '🔇 <b>Ничего не найдено.</b>\n\nПопробуйте другие ключевые слова.',
        INVALID: '❌ Запрос слишком длинный или пустой.',
        LANG_PICK: '🌐 <b>ВЫБЕРИТЕ ЯЗЫК</b>',
        LANG_SET: (l) => `✅ Язык изменён: <b>${l}</b>`,
        BTN_ALL: '⬇️ Все',
        TRACK_COUNT: (total, page, pages) => `🎵 <b>${total}</b> треков | 📄 ${page}/${pages}`,
        PROCESSING: '⚙️ <i>Обработка…</i>',
        SUCCESS: (ok, total) => `✅ Отправлено: <b>${ok}/${total}</b>`,
        DOWNLOAD_START: (name) => `⬇️ Загрузка: <i>${name}</i>`,
        DOWNLOAD_ERROR: (name) => `❌ Не удалось загрузить: <i>${name}</i>`,
        OPEN_APP: '🌐 Открыть Web App',
        APP_DESC: '🌐 <b>WEB APP</b>\n\nПолноценный музыкальный плеер:\n• Избранное  • Плейлисты\n• Недавние  • Скачивание',
        SENDING_ALL: (k) => `📤 <i>Отправляю ${k} треков…</i>`,
    },

    en: {
        WELCOME: (name) => `✨ <b>Hello, ${name}!</b>\n\n🎵 Welcome to <b>VMD-bot</b>!\nType a song name and download it 🎧`,
        START: '🎵 <b>VMD-bot</b>\n\nSend a song name — we\'ll find it!',
        HELP: '🔍 <b>HELP</b>\n\n📝 <b>Commands:</b>\n• Text → search music\n• /top → top 50\n• /lang → change language\n• /app → Web App\n• /about → about bot\n\n💡 Tap a number to download a track\n⬇️ «All» — download the whole page',
        ABOUT: 'ℹ️ <b>ABOUT BOT</b>\n\n📌 Version: 3.0\n🎵 Platform: Telegram\n⚡ Speed: Maximum',
        LOADING_TOP: '⏳',
        SEARCHING: (kw) => `🔍`,
        TOP_TITLE: '⭐ TOP 50',
        FAILED_TOP: '❌ <b>Error.</b> Try again: /top',
        FAILED_SEARCH: '❌ <b>Search error.</b> Please try another query.',
        NOT_FOUND: '🔇 <b>Nothing found.</b>\n\nTry different keywords.',
        INVALID: '❌ Query is too long or empty.',
        LANG_PICK: '🌐 <b>CHOOSE LANGUAGE</b>',
        LANG_SET: (l) => `✅ Language changed: <b>${l}</b>`,
        BTN_ALL: '⬇️ All',
        TRACK_COUNT: (total, page, pages) => `🎵 <b>${total}</b> tracks | 📄 ${page}/${pages}`,
        PROCESSING: '⚙️ <i>Processing…</i>',
        SUCCESS: (ok, total) => `✅ Sent: <b>${ok}/${total}</b>`,
        DOWNLOAD_START: (name) => `⬇️ Downloading: <i>${name}</i>`,
        DOWNLOAD_ERROR: (name) => `❌ Failed to load: <i>${name}</i>`,
        OPEN_APP: '🌐 Open Web App',
        APP_DESC: '🌐 <b>WEB APP</b>\n\nFull-featured music player:\n• Favorites  • Playlists\n• Recent  • Download',
        SENDING_ALL: (k) => `📤 <i>Sending ${k} tracks…</i>`,
    },
};

// ─── In-memory language cache (userId → lang) ─────────────────
const langCache = new Map();

export function getLang(userId) {
    return langCache.get(userId) ?? 'uz';
}

export function setLang(userId, lang) {
    langCache.set(userId, lang);
}

/**
 * Translate a key for a given userId.
 * Keys that are functions receive args; string keys are returned as-is.
 */
export function t(userId, key, ...args) {
    const lang = getLang(userId);
    const val = I18N[lang]?.[key] ?? I18N.en[key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
}