/**
 * Google Fonts splits each family into per-script subsets and the browser only
 * fetches one when it first has to draw a glyph from it. For Latin UI text that
 * is exactly right; for this app it is not:
 *
 *  - Config data is full of Cyrillic (host remarks like "🇳🇱 Нидерланды") even
 *    when the interface is in English, so the subset is needed sooner or later
 *    on almost every session.
 *  - CodeMirror measures one character's width when it initialises and builds
 *    its cursor and selection geometry from it. If the Cyrillic subset lands
 *    after that, Cyrillic renders in a fallback font at a different width —
 *    the font visibly changes mid-line and the caret stops lining up.
 *
 * Warming the subsets up front costs two small woff2 files and removes both.
 */
const CYRILLIC_SAMPLE = 'Ий';

const FACES = [
    "400 13px 'JetBrains Mono'",
    "700 13px 'JetBrains Mono'",
    '400 14px Inter',
    '600 14px Inter',
    '700 14px Inter',
];

export const warmCyrillicSubsets = (): Promise<void> => {
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    return Promise.all(
        // A family the browser cannot find rejects; there is nothing to do
        // about it and the fallback still renders, so failures are ignored.
        FACES.map(face => document.fonts.load(face, CYRILLIC_SAMPLE).catch(() => [])),
    ).then(() => undefined);
};
