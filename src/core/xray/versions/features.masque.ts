/**
 * Hand-written feature rows for MASQUE, and for the other keys that arrived
 * with 26.10 and have no editor of their own yet.
 *
 * Kept apart from features.ts so each area owns its rows; they are merged
 * there and win over generated rows for the same place. Same rules as the
 * rest of the table: every row cites `tag:file:line`, and the 26.10 column was
 * read from v26.10.10.
 *
 * MASQUE is in v26.9.30 and v26.10.10; no earlier supported tag has any of it.
 * The loader's registries and `StreamConfig` do not know the protocol, the
 * `masque` transport name or the `masqueSettings` key, so on 26.3, 26.7 and
 * 26.9 the protocol and the network are refused outright (the loader answers
 * "unknown config id" and "unknown transport protocol") and the settings key is
 * dropped without a word. `streamSettings.network = "masque"` is a value of
 * `stream.network`, so its per-line answer is in that value set (features.ts);
 * the protocol rows are `outbound.protocol.masque` and `inbound.protocol.masque`
 * in features.ts, where the protocol choosers ask for them by id.
 */
import type { CoreFeature, FeatureStatus } from './features';
import type { CoreVersionId } from './index';

const s = (
    v263: FeatureStatus,
    v267: FeatureStatus,
    v269: FeatureStatus,
    v2610: FeatureStatus = v269,
): Record<CoreVersionId, FeatureStatus> =>
    ({ '26.3': v263, '26.7': v267, '26.9': v269, '26.10': v2610 });

const SIDES = ['outbound', 'inbound'] as const;

/** `StreamConfig` on each older line: the struct that has no masqueSettings or xdriveSettings. */
const STREAM_STRUCT_WITHOUT = [
    'v26.3.27:infra/conf/transport_internet.go:1726',
    'v26.7.28:infra/conf/transport_internet.go:44',
    'v26.9.9:infra/conf/transport_internet.go:44',
];

const ST = 'streamSettings';
const MS = `${ST}.masqueSettings`;

/** The 26.10 struct a row's key is a field of. */
const MASQUE_CONFIG = 'v26.10.10:infra/conf/transport_method.go:804-811';
const MASQUE_WARP_CONFIG = 'v26.10.10:infra/conf/transport_method.go:798-802';

const masqueKeys: { key: string; parent: string; evidence: string; detail: string }[] = [
    { key: 'host', parent: MS, evidence: MASQUE_CONFIG, detail: 'The HTTP authority of the CONNECT-IP request; with warp it defaults to cloudflareaccess.com.' },
    { key: 'path', parent: MS, evidence: MASQUE_CONFIG, detail: 'The request path, with the target and ipproto variables; the default is /.well-known/masque/ip/*/*/ and, with warp, /.' },
    { key: 'user', parent: MS, evidence: MASQUE_CONFIG, detail: 'The user of a Basic Authorization header; cannot be combined with warp.' },
    { key: 'pass', parent: MS, evidence: MASQUE_CONFIG, detail: 'The password of a Basic Authorization header; cannot be combined with warp.' },
    { key: 'headers', parent: MS, evidence: MASQUE_CONFIG, detail: 'Extra request headers, as text values; Host and Capsule-Protocol are refused.' },
    { key: 'warp', parent: MS, evidence: MASQUE_CONFIG, detail: 'Connect to Cloudflare WARP over MASQUE: the device key pair and the address WARP assigned it. New in 26.10.' },
    { key: 'warp.privateKey', parent: `${MS}.warp`, evidence: MASQUE_WARP_CONFIG, detail: 'The device private key: ECDSA P-256, PKCS #8 or SEC 1, as PEM or base64.' },
    { key: 'warp.publicKey', parent: `${MS}.warp`, evidence: MASQUE_WARP_CONFIG, detail: 'The public key the WARP endpoint has to present: PKIX, as PEM or base64.' },
    { key: 'warp.address', parent: `${MS}.warp`, evidence: MASQUE_WARP_CONFIG, detail: 'The address WARP assigned the device: at most one IPv4 and one IPv6 address or prefix.' },
];

export const MASQUE_FEATURES: CoreFeature[] = [
    ...SIDES.flatMap(scope => [
        {
            id: `${scope}.masqueSettings`,
            scope,
            path: MS,
            status: s('absent', 'absent', 'absent', 'accepted'),
            detail: 'The masque transport settings arrived in 26.10; earlier lines have no such key and drop it silently.',
            evidence: [...STREAM_STRUCT_WITHOUT, 'v26.10.10:infra/conf/transport_internet.go:66'],
        } satisfies CoreFeature,
        ...masqueKeys.map(({ key, parent, evidence, detail }) => ({
            id: `${scope}.masqueSettings.${key}`,
            scope,
            path: `${MS}.${key}`,
            status: s('absent', 'absent', 'absent', 'accepted'),
            coveredBy: parent === MS ? `${scope}.masqueSettings` : `${scope}.masqueSettings.warp`,
            detail,
            evidence: [...STREAM_STRUCT_WITHOUT.slice(-1), evidence],
        } satisfies CoreFeature)),

        // ── xdrive: the other transport 26.10 registers ─────────────────
        // Cloud-drive storage as a carrier. Its value, `network: "xdrive"`, is in
        // the `stream.network` set; the settings key is dropped on older lines. No
        // editor draws it, so only the key itself has a row — its fields are
        // not enumerated.
        {
            id: `${scope}.xdriveSettings`,
            scope,
            path: `${ST}.xdriveSettings`,
            status: s('absent', 'absent', 'absent', 'accepted'),
            detail: 'The xdrive transport settings arrived in 26.10; earlier lines have no such key and drop it silently.',
            evidence: [...STREAM_STRUCT_WITHOUT, 'v26.10.10:infra/conf/transport_internet.go:67'],
        } satisfies CoreFeature,
    ]),
];
