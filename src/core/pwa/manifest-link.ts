// ============================================================
// Making sure the page actually links its manifest
// ============================================================

/**
 * The build injects `<link rel="manifest">` into index.html, and the deployed
 * file demonstrably carries it — yet on at least one Android browser the tag
 * is absent from the DOM by the time scripts run, and the browser then refuses
 * to install the app. Content blockers, reader modes and translation layers
 * all rewrite `<head>`, and none of them report doing it.
 *
 * Rather than keep guessing which one, put the tag back. It is idempotent, it
 * costs nothing when the tag is already there, and a browser that reads the
 * manifest late — which is every browser, since installability is evaluated
 * after load — sees it either way.
 */

/** Where the manifest lives, derived from the deploy's base path. */
export const manifestHref = (): string => `${import.meta.env.BASE_URL}manifest.webmanifest`;

export type ManifestLinkState = 'present' | 'restored' | 'unavailable';

export const ensureManifestLink = (): ManifestLinkState => {
    if (typeof document === 'undefined') return 'unavailable';
    if (document.querySelector('link[rel="manifest"]')) return 'present';

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestHref();
    document.head.appendChild(link);
    console.warn('[PWA] The manifest link was missing from the document; restored it.');
    return 'restored';
};
