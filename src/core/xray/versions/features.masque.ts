/**
 * Hand-written feature rows for MASQUE and xdrive, the two transports that
 * arrived in v26.9.30.
 *
 * Kept apart from features.ts so each area owns its rows; they are merged
 * there and win over generated rows for the same place. Same rules as the
 * rest of the table: every row cites `tag:file:line`, and the v26.9.30 and
 * 26.10 columns were read from v26.9.30 and v26.10.10.
 *
 * MASQUE and xdrive are in v26.9.30 and v26.10.10; no earlier supported tag
 * has any of it. The loader's registries and `StreamConfig` do not know the
 * protocol, the `masque` and `xdrive` transport names or the `masqueSettings`
 * and `xdriveSettings` keys, so on 26.3, 26.7 and 26.9 the protocol and the
 * networks are refused outright (the loader answers "unknown config id" and
 * "unknown transport protocol") and the settings keys are dropped without a
 * word. `streamSettings.network = "masque"` is a value of `stream.network`, so
 * its per-line answer is in that value set (features.ts); the protocol rows
 * are `outbound.protocol.masque` and `inbound.protocol.masque` in features.ts,
 * where the protocol choosers ask for them by id.
 *
 * The one part of MASQUE that is 26.10's alone is `warp`: Cloudflare WARP over
 * MASQUE. `MasqueConfig` has no `warp` field in v26.9.30
 * (v26.9.30:infra/conf/transport_method.go:793-799), and neither
 * `MasqueWarpConfig` nor transport/internet/masque/warp.go exists there, so
 * that line drops the key and cannot reach Cloudflare.
 */
import type { CoreFeature, FeatureStatus } from './features';
import { byLine } from './by-line';

const s = byLine<FeatureStatus>;

const SIDES = ['outbound', 'inbound'] as const;

/** `StreamConfig` on each older line: the struct that has no masqueSettings or xdriveSettings. */
const STREAM_STRUCT_WITHOUT = [
    'v26.3.27:infra/conf/transport_internet.go:1726',
    'v26.7.28:infra/conf/transport_internet.go:44',
    'v26.9.9:infra/conf/transport_internet.go:44',
];

const ST = 'streamSettings';
const MS = `${ST}.masqueSettings`;

/**
 * The struct a row's key is a field of: `MasqueConfig` without `warp` in
 * v26.9.30, with it in v26.10.10, and `MasqueWarpConfig` in v26.10.10 only.
 */
const MASQUE_CONFIG_2693 = 'v26.9.30:infra/conf/transport_method.go:793-799';
const MASQUE_CONFIG = 'v26.10.10:infra/conf/transport_method.go:804-811';
const MASQUE_WARP_CONFIG = 'v26.10.10:infra/conf/transport_method.go:798-802';

/** `warp`: the key, or a field of it — the part v26.9.30 does not have. */
const masqueKeys: { key: string; parent: string; evidence: string[]; warp?: boolean; detail: string }[] = [
    { key: 'host', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], detail: 'The HTTP authority of the CONNECT-IP request; with warp it defaults to cloudflareaccess.com.' },
    { key: 'path', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], detail: 'The request path, with the target and ipproto variables; the default is /.well-known/masque/ip/*/*/ and, with warp, /.' },
    { key: 'user', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], detail: 'The user of a Basic Authorization header; cannot be combined with warp.' },
    { key: 'pass', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], detail: 'The password of a Basic Authorization header; cannot be combined with warp.' },
    { key: 'headers', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], detail: 'Extra request headers, as text values; Host and Capsule-Protocol are refused.' },
    { key: 'warp', parent: MS, evidence: [MASQUE_CONFIG_2693, MASQUE_CONFIG], warp: true, detail: 'Connect to Cloudflare WARP over MASQUE: the device key pair and the address WARP assigned it. New in 26.10; v26.9.30 drops the key.' },
    { key: 'warp.privateKey', parent: `${MS}.warp`, evidence: [MASQUE_CONFIG_2693, MASQUE_WARP_CONFIG], warp: true, detail: 'The device private key: ECDSA P-256, PKCS #8 or SEC 1, as PEM or base64.' },
    { key: 'warp.publicKey', parent: `${MS}.warp`, evidence: [MASQUE_CONFIG_2693, MASQUE_WARP_CONFIG], warp: true, detail: 'The public key the WARP endpoint has to present: PKIX, as PEM or base64.' },
    { key: 'warp.address', parent: `${MS}.warp`, evidence: [MASQUE_CONFIG_2693, MASQUE_WARP_CONFIG], warp: true, detail: 'The address WARP assigned the device: at most one IPv4 and one IPv6 address or prefix.' },
];

const XS = `${ST}.xdriveSettings`;

/**
 * `XDriveConfig` (v26.10.10:infra/conf/transport_method.go:969-982, the same
 * struct at v26.9.30:infra/conf/transport_method.go:860-873), one row per
 * field, with its line in v26.10.10; v26.9.30 has each 109 lines earlier.
 */
const xdriveKeys: { key: string; line: number; detail: string }[] = [
    { key: 'remoteFolder', line: 970, detail: 'Where the files go: a folder path for local, a folder id for Google Drive, {folder} in a template.' },
    { key: 'service', line: 971, detail: 'The store: local, Google Drive or template, compared exactly; anything else fails the config.' },
    { key: 'secrets', line: 972, detail: 'Credentials: exactly three for Google Drive (client ID, client secret, refresh token); {secret0}… in a template.' },
    { key: 'segmentBytes', line: 973, detail: 'The largest piece written as one file; 0 is 512 KiB, capped at 16 MiB.' },
    { key: 'flushIntervalMs', line: 974, detail: 'How long data waits before a short piece is written; 0 is 20 ms.' },
    { key: 'pollIntervalMs', line: 975, detail: 'The fastest polling for the files the other side writes; 0 is 50 ms.' },
    { key: 'maxPollIntervalMs', line: 976, detail: 'The slowest polling once idle; 0 is 500 ms, never below the poll interval.' },
    { key: 'sessionTtlSeconds', line: 977, detail: 'How long an unclaimed or idle session is kept; 0 is 5 minutes.' },
    { key: 'concurrency', line: 978, detail: 'File transfers at once; 0 is 8, capped at 64.' },
    { key: 'eagerWindowMs', line: 979, detail: 'How long after traffic polling stays at its fastest; 0 is 2 s.' },
    { key: 'holeTimeoutMs', line: 980, detail: 'How long a missing piece is waited for while later ones arrive; 0 is 30 s.' },
    { key: 'template', line: 981, detail: 'The HTTP calls of a template store: put, get, list and delete, with auth and retry; required for template.' },
];

export const MASQUE_FEATURES: CoreFeature[] = [
    ...SIDES.flatMap(scope => [
        {
            id: `${scope}.masqueSettings`,
            scope,
            path: MS,
            status: s('absent', 'absent', 'absent', 'accepted', 'accepted'),
            detail: 'The masque transport settings arrived in v26.9.30; earlier lines have no such key and drop it silently.',
            evidence: [...STREAM_STRUCT_WITHOUT, 'v26.9.30:infra/conf/transport_internet.go:66', 'v26.10.10:infra/conf/transport_internet.go:66'],
        } satisfies CoreFeature,
        ...masqueKeys.map(({ key, parent, evidence, warp, detail }) => ({
            id: `${scope}.masqueSettings.${key}`,
            scope,
            path: `${MS}.${key}`,
            // warp is the one part v26.9.30 does not have.
            status: warp ? s('absent', 'absent', 'absent', 'absent', 'accepted') : s('absent', 'absent', 'absent', 'accepted', 'accepted'),
            coveredBy: parent === MS ? `${scope}.masqueSettings` : `${scope}.masqueSettings.warp`,
            detail,
            evidence: [...STREAM_STRUCT_WITHOUT.slice(-1), ...evidence],
        } satisfies CoreFeature)),

        // ── xdrive: the other transport v26.9.30 registers ──────────────
        // A shared store as the carrier. Its value, `network: "xdrive"`, is in
        // the `stream.network` set; the settings key is dropped on older lines,
        // and so is every field of it (each row is covered by the key's).
        // What Build() and the store refuse is in core/xray/xdrive.ts.
        {
            id: `${scope}.xdriveSettings`,
            scope,
            path: `${ST}.xdriveSettings`,
            status: s('absent', 'absent', 'absent', 'accepted', 'accepted'),
            detail: 'The xdrive transport settings arrived in v26.9.30; earlier lines have no such key and drop it silently.',
            evidence: [...STREAM_STRUCT_WITHOUT, 'v26.9.30:infra/conf/transport_internet.go:67', 'v26.10.10:infra/conf/transport_internet.go:67'],
        } satisfies CoreFeature,
        ...xdriveKeys.map(({ key, line, detail }) => ({
            id: `${scope}.xdriveSettings.${key}`,
            scope,
            path: `${XS}.${key}`,
            status: s('absent', 'absent', 'absent', 'accepted', 'accepted'),
            coveredBy: `${scope}.xdriveSettings`,
            detail,
            evidence: [...STREAM_STRUCT_WITHOUT.slice(-1), `v26.9.30:infra/conf/transport_method.go:${line - 109}`, `v26.10.10:infra/conf/transport_method.go:${line}`],
        } satisfies CoreFeature)),
    ]),
];
