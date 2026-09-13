// ============================================================
// Host field options — src/core/presets/host-fields.ts
// ============================================================
//
// The closed value sets a Remnawave host row accepts. They live here rather
// than inline in the form so the editor and any future consumer offer exactly
// what the panel validates against — a value outside these lists is rejected
// by the API, which is a confusing way to learn about a typo.
// ============================================================

/**
 * How a client secures the connection to this host.
 *   DEFAULT — whatever the inbound itself runs
 *   TLS     — force TLS, the usual choice for an inbound published behind a CDN
 *   NONE    — no transport security
 */
export const HOST_SECURITY_LAYERS = ['DEFAULT', 'TLS', 'NONE'] as const;

/** uTLS fingerprints the panel offers; empty means "leave it to the client". */
export const HOST_FINGERPRINTS = [
    'randomized',
    'random',
    'chrome',
    'firefox',
    'safari',
    'edge',
    'ios',
    'android',
    'qq',
    '360',
] as const;

/** ALPN sets, written the way the API stores them: one comma-joined string. */
export const HOST_ALPN_OPTIONS = [
    'h3,h2,http/1.1',
    'h2,http/1.1',
    'h3,h2',
    'h3',
    'h2',
    'http/1.1',
] as const;
