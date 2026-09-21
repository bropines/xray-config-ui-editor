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
    limitFallbackUpload: { direction: 'server', advanced: true },
    limitFallbackDownload: { direction: 'server', advanced: true },

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
    allowInsecure: { direction: 'client' },
    fingerprint: { direction: 'client', note: 'uTLS Client Hello fingerprint.' },
    verifyPeerCertByName: { direction: 'client', advanced: true },
    pinnedPeerCertSha256: { direction: 'client', advanced: true },
    disableSystemRoot: { direction: 'client', advanced: true, note: 'Trust store is a client concern.' },
    echConfigList: { direction: 'client', advanced: true },

    // ── Both ────────────────────────────────────────────────────────────────
    alpn: { direction: 'both' },
    certificates: { direction: 'both', advanced: true, note: 'A client needs these for mutual TLS.' },
    minVersion: { direction: 'both', advanced: true },
    maxVersion: { direction: 'both', advanced: true },
    cipherSuites: { direction: 'both', advanced: true },
    curvePreferences: { direction: 'both', advanced: true },
    enableSessionResumption: { direction: 'both', advanced: true },
    masterKeyLog: { direction: 'both', advanced: true },
    echSockopt: { direction: 'both', advanced: true },
};

const visibleOn = (spec: FieldSpec, side: Side): boolean =>
    spec.direction === 'both' || spec.direction === (side === 'inbound' ? 'server' : 'client');

/**
 * Keys a form should hide for one side and one disclosure level.
 *
 * Anything the table does not declare is shown rather than hidden: a field
 * nobody has classified yet is better surfaced than silently unreachable,
 * which is how several TLS fields became impossible to set outside raw JSON.
 */
export const hiddenKeysFor = (
    schemaKeys: string[],
    fields: Record<string, FieldSpec>,
    side: Side,
    level: 'basic' | 'advanced' = 'basic',
): string[] =>
    schemaKeys.filter(key => {
        const spec = fields[key];
        if (!spec) return false;
        if (!visibleOn(spec, side)) return true;
        return level === 'basic' ? !!spec.advanced : !spec.advanced;
    });

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
        if (!spec) return false;
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
