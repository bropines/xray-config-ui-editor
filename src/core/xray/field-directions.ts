// ============================================================
// Which side of a connection each security field belongs to
// ============================================================

/**
 * A TLS or REALITY settings object is one schema shared by inbounds and
 * outbounds, because Xray-core itself uses one Go struct for both and decides
 * at build time which half it reads. The UI has to make that split visible —
 * showing a server-only field on a client is how people end up writing keys
 * the core silently ignores.
 *
 * That split used to live in five hand-written `excludeKeys` arrays inside
 * TransportSettings, with nothing tying them to the schema. A field added to
 * the schema appeared on both sides; a field dropped from it left a stale
 * entry behind; and several fields were excluded from every list at once and
 * so could not be reached in the UI at all. Declaring the direction once, here,
 * and deriving every list from it is what stops that drifting again —
 * `field-directions.test.ts` fails if a schema key has no declaration.
 */
export type Direction =
    /** Read only when the settings object belongs to an inbound. */
    | 'server'
    /** Read only when it belongs to an outbound. */
    | 'client'
    /** Read on both sides. */
    | 'both';

export type Side = 'inbound' | 'outbound';

export interface FieldSpec {
    direction: Direction;
    /** Kept behind the "Extended" disclosure rather than shown by default. */
    advanced?: boolean;
    /** Why the direction is what it is, where it is not obvious. */
    note?: string;
    /**
     * Never offered by a form, on either side, at any disclosure level: every
     * supported core refuses or ignores the part of it anyone would set. A
     * value a config already holds is not dropped silently — the editor names
     * it in a notice beside the form, with the replacement and a way to remove
     * it (TransportSettings) — but a form that renders it as an ordinary
     * switch is how people keep writing it.
     */
    retired?: boolean;
}

/**
 * REALITY.
 *
 * `REALITYConfig.Build()` in xray-core branches on whether `dest`/`target` is
 * set: the server branch reads the handshake target, serverNames, privateKey
 * and shortIds; the client branch reads serverName, fingerprint, the public
 * key and spiderX. Neither branch reads the other's fields.
 */
export const REALITY_FIELDS: Record<string, FieldSpec> = {
    // ── Server ──────────────────────────────────────────────────────────────
    target: { direction: 'server', note: 'Its presence is what puts REALITY in server mode.' },
    dest: { direction: 'server', note: 'Legacy alias for target.' },
    type: { direction: 'server', advanced: true, note: 'Network of the handshake target: tcp or unix.' },
    xver: { direction: 'server' },
    serverNames: { direction: 'server' },
    privateKey: { direction: 'server' },
    shortIds: { direction: 'server' },
    minClientVer: { direction: 'server', advanced: true },
    maxClientVer: { direction: 'server', advanced: true },
    maxTimeDiff: { direction: 'server', advanced: true },
    mldsa65Seed: { direction: 'server', advanced: true },
    limitFallbackUpload: {
        direction: 'server',
        advanced: true,
        note: 'Copied only in the server branch of Build() '
            + '(v26.7.28:infra/conf/transport_security.go:171-174, same at v26.9.9; '
            + 'v26.3.27:infra/conf/transport_internet.go:918-921). Caps what a '
            + 'connection REALITY forwards to the target may send there.',
    },
    limitFallbackDownload: {
        direction: 'server',
        advanced: true,
        note: 'As limitFallbackUpload, for the other direction '
            + '(v26.7.28:infra/conf/transport_security.go:175-178).',
    },

    // ── Client ──────────────────────────────────────────────────────────────
    serverName: { direction: 'client' },
    fingerprint: { direction: 'client' },
    password: { direction: 'client', note: 'The server public key; renamed from publicKey upstream.' },
    publicKey: { direction: 'client', note: 'Legacy alias for password.' },
    shortId: { direction: 'client', note: 'One of the server shortIds, singular.' },
    spiderX: {
        direction: 'client',
        note: 'The crawl path the client walks after the handshake. The server '
            + 'branch of Build() never reads it, so setting it on an inbound '
            + 'writes a key the core ignores.',
    },
    mldsa65Verify: { direction: 'client', advanced: true },

    // ── Both ────────────────────────────────────────────────────────────────
    show: { direction: 'both', advanced: true, note: 'Debug logging, read on either side.' },
    masterKeyLog: { direction: 'both', advanced: true },
};

/**
 * TLS.
 *
 * Certificates are marked `both` on purpose: a client presents one for mutual
 * TLS, so hiding the field from outbounds would make mTLS unconfigurable.
 */
export const TLS_FIELDS: Record<string, FieldSpec> = {
    // ── Server ──────────────────────────────────────────────────────────────
    rejectUnknownSni: { direction: 'server' },
    echServerKeys: { direction: 'server', advanced: true },

    // ── Client ──────────────────────────────────────────────────────────────
    serverName: { direction: 'client' },
    allowInsecure: {
        direction: 'client',
        retired: true,
        note: '`true` is a removed feature on every supported line: 26.7 and 26.9 '
            + 'refuse it outright (v26.7.28:infra/conf/transport_security.go:362), and '
            + '26.3 does since 2026-06-01 (v26.3.27:infra/conf/transport_internet.go:711, '
            + 'a clock check). `false` is harmless and means nothing. Replaced by '
            + 'pinnedPeerCertSha256 / verifyPeerCertByName.',
    },
    fingerprint: { direction: 'client', note: 'uTLS Client Hello fingerprint.' },
    verifyPeerCertByName: { direction: 'client', advanced: true },
    pinnedPeerCertSha256: {
        direction: 'client',
        advanced: true,
        note: 'Hex, comma-separated; see core/xray/security-fields. Checked against the '
            + 'certificates the peer presents (v26.7.28:transport/internet/tls/config.go:298-311).',
    },
    disableSystemRoot: { direction: 'client', advanced: true, note: 'Trust store is a client concern.' },
    useSystemCA: {
        direction: 'client',
        advanced: true,
        note: 'Read where the trust store is built for verifying a peer '
            + '(v26.10.10:transport/internet/tls/config.go:369-390). 26.10 only: the line '
            + 'drops the system store as its default, so this brings it back.',
    },
    echConfigList: { direction: 'client', advanced: true },
    echForceQuery: {
        direction: 'client',
        advanced: true,
        note: 'Only 26.3 reads it (v26.3.27:infra/conf/transport_internet.go:756); '
            + 'the editor offers it on that line alone, via the feature table.',
    },
    echSockopt: {
        direction: 'client',
        advanced: true,
        note: 'Was listed as `both`. Its one reader is the DNS query that fetches the ECH '
            + 'config, inside the branch ApplyECH() runs only when echConfigList — a client '
            + 'key — is set (v26.7.28:transport/internet/tls/ech.go:50 and :72, same at '
            + 'v26.9.9; v26.3.27:transport/internet/tls/ech.go:51 and :86). The server '
            + 'half of ApplyECH() reads echServerKeys alone.',
    },

    // ── Both ────────────────────────────────────────────────────────────────
    alpn: { direction: 'both' },
    certificates: { direction: 'both', advanced: true, note: 'A client needs these for mutual TLS.' },
    minVersion: { direction: 'both', advanced: true },
    maxVersion: { direction: 'both', advanced: true },
    cipherSuites: { direction: 'both', advanced: true },
    curvePreferences: { direction: 'both', advanced: true },
    enableSessionResumption: { direction: 'both', advanced: true },
    masterKeyLog: { direction: 'both', advanced: true },
};

const visibleOn = (spec: FieldSpec, side: Side): boolean =>
    spec.direction === 'both' || spec.direction === (side === 'inbound' ? 'server' : 'client');

/** Whether a settings object actually carries something under `key`. */
const hasValue = (value: Record<string, unknown> | undefined, key: string): boolean => {
    const held = value?.[key];
    if (held === undefined || held === null || held === '') return false;
    if (Array.isArray(held)) return held.length > 0;
    return true;
};

/**
 * Keys a form should hide for one side and one disclosure level.
 *
 * Two rules, and the second matters more than it looks:
 *
 * 1. Anything the table does not declare is shown rather than hidden. A field
 *    nobody has classified yet is better surfaced than silently unreachable,
 *    which is how several TLS fields became impossible to set outside JSON.
 * 2. A field that already holds a value is always shown, whichever side it
 *    belongs to. Panels do write client keys into server inbounds — a
 *    `fingerprint` and a `spiderX` copied across from a client template is
 *    common in the wild — and hiding a key that is present in the data leaves
 *    the user unable to see it or delete it while the app keeps writing it
 *    back. Direction decides what an empty form offers, never what an existing
 *    config is allowed to show.
 *
 * A retired field is the one exception to the second rule, and only because
 * it is not hidden so much as moved: the editor shows a held value in a notice
 * with a remove button rather than as a switch that invites setting it again.
 */
export const hiddenKeysFor = (
    schemaKeys: string[],
    fields: Record<string, FieldSpec>,
    side: Side,
    level: 'basic' | 'advanced' = 'basic',
    value?: Record<string, unknown>,
): string[] =>
    schemaKeys.filter(key => {
        const spec = fields[key];
        if (!spec) return false;
        if (spec.retired) return true;
        const foreign = !visibleOn(spec, side);
        // A foreign field with a value is surfaced at the basic level, where
        // the warning above the form points at it.
        if (foreign) return hasValue(value, key) ? level !== 'basic' : true;
        return level === 'basic' ? !!spec.advanced : !spec.advanced;
    });

/**
 * Fields present in the config that this side's core never reads.
 *
 * Worth saying out loud rather than just rendering: the value is real, it is
 * saved, and it does nothing — which is a confusing thing to discover from a
 * config that "has" a setting that never took effect.
 */
export const foreignFieldsIn = (
    fields: Record<string, FieldSpec>,
    side: Side,
    value: Record<string, unknown> | undefined,
): string[] =>
    Object.keys(fields).filter(key => !fields[key]!.retired && !visibleOn(fields[key]!, side) && hasValue(value, key));

export interface DirectionAudit {
    /** In the schema, with no declared direction — shown on both sides. */
    undeclared: string[];
    /** Declared here but no longer in the schema. */
    stale: string[];
    /** Fields that no side and no disclosure level would ever render. */
    unreachable: string[];
}

/** Compares a schema's keys against this table. Used by the test and the CLI report. */
export const auditDirections = (
    schemaKeys: string[],
    fields: Record<string, FieldSpec>,
): DirectionAudit => {
    const declared = Object.keys(fields);
    const unreachable = schemaKeys.filter(key => {
        const spec = fields[key];
        // A retired field is unreachable on purpose; its notice is the way in.
        if (!spec || spec.retired) return false;
        return (['inbound', 'outbound'] as Side[]).every(side =>
            (['basic', 'advanced'] as const).every(level =>
                hiddenKeysFor([key], fields, side, level).length > 0));
    });
    return {
        undeclared: schemaKeys.filter(key => !declared.includes(key)).sort(),
        stale: declared.filter(key => !schemaKeys.includes(key)).sort(),
        unreachable: unreachable.sort(),
    };
};
