// ============================================================
// A spiderX path that looks like something a browser asked for
// ============================================================

import { generateShortId } from './crypto';

/**
 * `spiderX` is the path a REALITY client requests on the real target site
 * after the handshake. The old generator emitted `/xzga` — four random
 * letters, which is the one shape a browser never asks for. Real requests are
 * pages, bundles, images and API calls, and they look like it.
 *
 * Nothing here can know what the chosen target actually serves, and a path the
 * target really has beats a plausible one every time — that choice stays the
 * user's. What this can do is stop handing out a string that reads as
 * machine-generated at a glance.
 *
 * No query strings: xray-core parses spiderX as a URL and reads the spider's
 * own tuning ranges out of its query, so `?q=...` is not decoration there, it
 * is configuration that would be silently consumed.
 */
export type SpiderPathShape =
    /** A page a person would navigate to: /docs/getting-started. */
    | 'page'
    /** A file the page pulls in: /assets/js/app.4f21c0a9.js. */
    | 'asset'
    /** A call the page makes: /api/v2/users/me. */
    | 'api';

export interface SpiderPathOptions {
    /** Force one shape. Omit to let the generator choose. */
    shape?: SpiderPathShape;
    /** A value not to return, so clicking the dice always changes something. */
    avoid?: string;
}

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

const chance = (probability: number): boolean => Math.random() < probability;

// ── Pages ───────────────────────────────────────────────────────────────────

const PAGES = [
    '/about', '/about/team', '/about/contact', '/careers', '/contact',
    '/pricing', '/products', '/features', '/solutions', '/customers',
    '/support', '/support/faq', '/help', '/help/getting-started',
    '/docs', '/docs/getting-started', '/docs/api/authentication',
    '/legal/privacy', '/legal/terms', '/status', '/downloads',
    '/account/settings', '/news', '/blog',
] as const;

const SLUGS = [
    'release-notes', 'whats-new', 'getting-started', 'security-update',
    'performance-improvements', 'migration-guide', 'best-practices',
    'annual-report', 'behind-the-scenes', 'product-update',
] as const;

const pagePath = (): string => {
    // A dated archive is the most ordinary-looking deep link on the web, and
    // it carries enough variety that two clicks rarely land on the same one.
    if (chance(0.35)) {
        const year = new Date().getUTCFullYear() - Math.floor(Math.random() * 5);
        const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
        return `/${pick(['blog', 'news', 'articles'])}/${year}/${month}/${pick(SLUGS)}`;
    }
    return pick(PAGES);
};

// ── Assets ──────────────────────────────────────────────────────────────────

const ASSET_ROOTS = ['/assets', '/static', '/dist', '/public', '/cdn'] as const;
const BUNDLE_NAMES = ['app', 'main', 'index', 'vendor', 'runtime', 'polyfills', 'common', 'client'] as const;
const STYLE_NAMES = ['app', 'main', 'styles', 'theme', 'layout', 'critical'] as const;
const IMAGE_DIRS = ['img', 'images', 'media'] as const;
const IMAGE_NAMES = ['logo', 'hero', 'banner', 'og-image', 'icon-sprite', 'background', 'placeholder'] as const;
const IMAGE_EXTS = ['webp', 'png', 'jpg', 'svg'] as const;
const FONT_FAMILIES = ['inter', 'roboto', 'open-sans', 'lato', 'manrope', 'source-sans'] as const;
const FONT_WEIGHTS = ['400', '500', '600', '700'] as const;
const FONT_SUBSETS = ['latin', 'latin-ext', 'cyrillic'] as const;

const assetPath = (): string => {
    const root = pick(ASSET_ROOTS);
    switch (pick(['script', 'style', 'image', 'font'] as const)) {
        case 'script':
            // A content hash in the filename is what every modern build emits.
            return chance(0.6)
                ? `${root}/js/${pick(BUNDLE_NAMES)}.${generateShortId(8)}.js`
                : `${root}/js/${pick(BUNDLE_NAMES)}.min.js`;
        case 'style':
            return chance(0.6)
                ? `${root}/css/${pick(STYLE_NAMES)}.${generateShortId(8)}.css`
                : `${root}/css/${pick(STYLE_NAMES)}.min.css`;
        case 'font':
            return `${root}/fonts/${pick(FONT_FAMILIES)}-${pick(FONT_WEIGHTS)}-${pick(FONT_SUBSETS)}.woff2`;
        case 'image':
        default:
            return `${root}/${pick(IMAGE_DIRS)}/${pick(IMAGE_NAMES)}.${pick(IMAGE_EXTS)}`;
    }
};

// ── API calls ───────────────────────────────────────────────────────────────

const API_ROOTS = ['/api', '/api/v1', '/api/v2', '/api/v3'] as const;
const API_RESOURCES = [
    'status', 'health', 'config', 'session', 'profile', 'users/me',
    'search', 'feed', 'catalog/items', 'orders', 'notifications',
    'settings', 'metrics', 'events', 'auth/token', 'account/subscription',
] as const;

const apiPath = (): string => `${pick(API_ROOTS)}/${pick(API_RESOURCES)}`;

// ── Choosing a shape ────────────────────────────────────────────────────────

const BUILDERS: Record<SpiderPathShape, () => string> = {
    page: pagePath,
    asset: assetPath,
    api: apiPath,
};

/** Weighted towards what a browser actually spends its requests on. */
const SHAPE_WEIGHTS: readonly (readonly [SpiderPathShape, number])[] = [
    ['asset', 45],
    ['page', 35],
    ['api', 20],
];

const randomShape = (): SpiderPathShape => {
    const total = SHAPE_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [shape, weight] of SHAPE_WEIGHTS) {
        roll -= weight;
        if (roll < 0) return shape;
    }
    return 'asset';
};

/**
 * Builds a spiderX path that reads like a real request.
 *
 * `avoid` exists because a dice button that returns the value already in the
 * field looks broken. The corpus is finite, so this retries rather than
 * guarantees — after a dozen collisions it returns what it has.
 */
export const generateSpiderPath = (options: SpiderPathOptions = {}): string => {
    const avoid = options.avoid?.trim();
    let path = '';
    for (let attempt = 0; attempt < 12; attempt++) {
        path = BUILDERS[options.shape ?? randomShape()]();
        if (path !== avoid) break;
    }
    return path;
};
