import { Markup } from "telegraf";

export const TRACKS_PER_PAGE = 10;

export function buildResultMessage(userId, t, keyword, tracks, page, isTop = false) {
    const totalPages = Math.max(Math.ceil(tracks.length / TRACKS_PER_PAGE), 1);
    const p = Math.max(0, Math.min(page, totalPages - 1));
    const start = p * TRACKS_PER_PAGE;
    const slice = tracks.slice(start, start + TRACKS_PER_PAGE);

    const header = isTop ? `⭐ <b>${t(userId, "TOP_TITLE")}</b>\n` : `🔍 <b>${keyword}</b>\n`;
    const countLine = t(userId, "TRACK_COUNT", tracks.length, p + 1, totalPages);

    let body = `${header}━━━━━━━━━━━━━━━━\n${countLine}\n━━━━━━━━━━━━━━━━\n\n`;
    slice.forEach((track, i) => {
        body += `<b>${start + i + 1}.</b> ${track.name}\n`;
    });
    body += "\n<i>Raqamni bosing — yuklab olish</i>";

    return { text: body, page: p, totalPages, count: slice.length };
}

export function buildKeyboard(searchId, page, count, totalPages, langKey) {
    const row1 = [];
    const row2 = [];

    const mkBtn = (n) =>
        Markup.button.callback(
            String(n), // ✅ emoji emas, oddiy raqam
            `pick:${searchId}:${page}:${n}`
        );

    const mkEmpty = () =>
        Markup.button.callback("·", "noop"); // bo‘sh slot

    for (let n = 1; n <= 5; n++) row1.push(n <= count ? mkBtn(n) : mkEmpty());
    for (let n = 6; n <= 10; n++) row2.push(n <= count ? mkBtn(n) : mkEmpty());

    const nav = [
        Markup.button.callback("◀", page > 0 ? `page:${searchId}:${page - 1}` : "noop"),
        Markup.button.callback(langKey, `all:${searchId}:${page}`),
        Markup.button.callback("▶", page < totalPages - 1 ? `page:${searchId}:${page + 1}` : "noop"),
    ];

    return Markup.inlineKeyboard([row1, row2, nav]);
}