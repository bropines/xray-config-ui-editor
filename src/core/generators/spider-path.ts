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
    /**
     * Real paths to draw from instead of building one. A path the target
     * actually serves is the right answer; anything generated here is a
     * stand-in for not having one.
     */
    pool?: readonly string[];
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
    const pool = (options.pool ?? []).filter(path => typeof path === 'string' && path.startsWith('/'));
    let path = '';
    for (let attempt = 0; attempt < 12; attempt++) {
        // A supplied path wins over an invented one, always.
        path = pool.length > 0 ? pick(pool) : BUILDERS[options.shape ?? randomShape()]();
        if (path !== avoid) break;
    }
    return path;
};

// ── Reading paths out of whatever was pasted ────────────────────────────────

/**
 * The honest answer to "what should spiderX be" is "a path the target really
 * serves", and those paths always live in text somewhere: a sitemap, a HAR
 * export, a copied network tab, the page's own HTML, or a list written by
 * hand. Rather than asking which of those this is, take them all and keep
 * whatever survives normalisation.
 */
const ATTRIBUTE_PATTERN = /\b(?:href|src|url)\s*[=:]\s*["']([^"']+)["']/gi;
const ABSOLUTE_URL_PATTERN = /\bhttps?:\/\/[^\s"'<>)\]]+/gi;

/** Longer than this is a data URI or a tracking blob, not a browsing path. */
const MAX_PATH_LENGTH = 200;
const DEFAULT_LIMIT = 500;

const normalisePath = (raw: string): string | null => {
    const candidate = raw.trim();
    // A leading # is a comment in every hand-written list.
    if (!candidate || candidate.startsWith('#')) return null;
    if (!/^(?:https?:\/\/|\/)/i.test(candidate)) return null;
    if (/[\s<>"'\\]/.test(candidate)) return null;

    let path: string;
    try {
        // Resolving against a base normalises both absolute URLs and bare
        // paths, percent-encodes non-ASCII once, and drops query and fragment
        // — which spiderX cannot carry as decoration anyway.
        path = new URL(candidate, 'https://spider.invalid').pathname;
    } catch {
        return null;
    }

    path = path.replace(/\/{2,}/g, '/');
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path.length <= MAX_PATH_LENGTH ? path : null;
};

const hostOf = (raw: string): string | null => {
    if (!/^https?:\/\//i.test(raw.trim())) return null;
    try {
        return new URL(raw.trim()).host || null;
    } catch {
        return null;
    }
};

/**
 * Picks the site the pasted text is about.
 *
 * Any real paste carries URLs that are not the site: an XML namespace, an
 * analytics beacon, a font CDN. Their paths exist on someone else's server,
 * and spiderX is walked on the target — so keeping them would fill the list
 * with paths guaranteed to 404. The site is whichever host appears most,
 * first-seen winning a tie.
 */
const dominantHost = (hosts: readonly (string | null)[]): string | null => {
    const counts = new Map<string, number>();
    for (const host of hosts) {
        if (host) counts.set(host, (counts.get(host) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [host, count] of counts) {
        if (count > bestCount) {
            best = host;
            bestCount = count;
        }
    }
    return best;
};

/**
 * Extracts spiderX-usable paths from pasted text, in the order they appear,
 * without duplicates. Returns an empty array when there is nothing usable,
 * which the caller should report rather than treat as success.
 */
export const parseSpiderPaths = (input: string, options: { limit?: number } = {}): string[] => {
    if (!input) return [];
    const limit = Math.max(0, options.limit ?? DEFAULT_LIMIT);

    const candidates: string[] = [];
    // HTML attributes and HAR-style "url": "…" entries.
    for (const match of input.matchAll(ATTRIBUTE_PATTERN)) if (match[1]) candidates.push(match[1]);
    // Bare absolute URLs: sitemaps, copied request lists, access logs.
    for (const match of input.matchAll(ABSOLUTE_URL_PATTERN)) candidates.push(match[0]);
    // Whatever is left is a hand-written list, one path per line.
    for (const line of input.split(/\r?\n/)) candidates.push(line);

    const hosts = candidates.map(hostOf);
    const site = dominantHost(hosts);

    const paths: string[] = [];
    const seen = new Set<string>();
    for (const [index, candidate] of candidates.entries()) {
        if (paths.length >= limit) break;
        // A relative path came from the page itself, so it is already the
        // site's; an absolute one has to belong to the site to be usable.
        const host = hosts[index];
        if (host && host !== site) continue;
        const path = normalisePath(candidate);
        if (!path || seen.has(path)) continue;
        seen.add(path);
        paths.push(path);
    }
    return paths;
};

/**
 * Adds parsed paths to a stored list, keeping the existing order and dropping
 * what is already there — the same "extend, do not replace" rule the shortId
 * generator follows, for the same reason.
 */
export const mergeSpiderPaths = (
    existing: readonly string[],
    incoming: readonly string[],
    limit = DEFAULT_LIMIT,
): string[] => {
    const seen = new Set(existing);
    const merged = [...existing];
    for (const path of incoming) {
        if (merged.length >= limit) break;
        if (seen.has(path)) continue;
        seen.add(path);
        merged.push(path);
    }
    return merged;
};
