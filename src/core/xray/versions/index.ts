/**
 * The Xray-core releases this editor targets.
 *
 * A config is only right or wrong relative to the core that loads it: the same
 * `proxySettings` block runs on 26.7.28 and stops 26.9.9 from starting, and the
 * shadowsocks `uot` switch that does something on 26.3.27 is silently ignored
 * from 26.7.28 on. So every "does this field exist / is this value allowed"
 * question in the app is asked of a version, and this is the list of versions.
 *
 * One entry per major.minor. A patch release is assumed to keep the config
 * surface of its line — when that stops being true, it gets its own entry,
 * named by the patch it starts at. 26.9 has two: v26.9.9 and v26.9.30. The
 * second is not a patch with the same surface. It registers the `masque`
 * protocol and transport and the `xdrive` transport, adds two keys to the tun
 * inbound, takes the noise `exp` item, hands xdns objects instead of strings,
 * moves Shadowsocks to its own 2022 code, drops WireGuard's `domainStrategy`
 * and udphop's `sockopt`, and replaces the finalmask chain's levels — so a
 * config that loads on one is refused or half-read by the other. The line
 * stops short of 26.10 in four places: no `warp` in `masqueSettings`, no
 * `useSystemCA`, no dns/routing scripts or dns server `id`, and an xdns that
 * still reads `name` and `{type, settings}` where 26.10 reads `names` and
 * `addrs`.
 *
 * The tag is the release the line's facts were read from; it moves to a later
 * patch only when that patch changed nothing a config can say.
 *
 * The oldest entry is the support floor. Older cores are not modelled: a config
 * written for them may well work, but nothing here will say so.
 */

export type CoreVersionId = '26.3' | '26.7' | '26.9' | '26.9.30' | '26.10';

export interface CoreVersion {
    id: CoreVersionId;
    /** The release tag the facts for this line were read from. */
    tag: string;
    /** Why this line is on the list, in a word or two. */
    role: 'minimum' | 'remnawave' | 'before-masque' | 'previous' | 'latest';
}

/** Oldest first — the order `compareCoreVersions` relies on. */
export const CORE_VERSIONS: CoreVersion[] = [
    { id: '26.3', tag: 'v26.3.27', role: 'minimum' },
    { id: '26.7', tag: 'v26.7.28', role: 'remnawave' },
    { id: '26.9', tag: 'v26.9.9', role: 'before-masque' },
    { id: '26.9.30', tag: 'v26.9.30', role: 'previous' },
    { id: '26.10', tag: 'v26.10.10', role: 'latest' },
];

/**
 * What a config is checked against until someone says otherwise.
 *
 * The line Remnawave nodes run: this editor exists mostly to write configs for
 * a panel, so the default answers "will my nodes start with this", not "is
 * this the newest syntax".
 */
export const DEFAULT_CORE_VERSION: CoreVersionId = '26.7';

const IDS = new Set<string>(CORE_VERSIONS.map(version => version.id));

export const isCoreVersionId = (value: unknown): value is CoreVersionId =>
    typeof value === 'string' && IDS.has(value);

/**
 * The lines named by a patch: `26.9.30` is "26.9 from patch 30 on". A tag of
 * that minor below the patch stays on the plain `26.9`; a tag at or past it
 * (v26.9.30 itself, a later v26.9.x) is on the entry.
 */
const PATCH_LINES = CORE_VERSIONS.flatMap(version => {
    const match = /^(\d+\.\d+)\.(\d+)$/.exec(version.id);
    return match ? [{ minor: match[1]!, from: Number(match[2]), id: version.id }] : [];
});

/**
 * Read a stored version back.
 *
 * The setting used to hold `v1.8.10`, `v1.8.0` or `v1.5.0` — options that
 * changed nothing, because nothing read them. Those, a bare tag like
 * `v26.7.28`, and anything else unrecognised land on a supported line: the
 * matching one when the tag names it, the default otherwise. A tag of a
 * minor that has more than one line (26.9) is read to its patch.
 */
export const coreVersionId = (value: unknown): CoreVersionId => {
    if (isCoreVersionId(value)) return value;
    if (typeof value === 'string') {
        const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(value.trim());
        if (match) {
            const minor = `${match[1]}.${match[2]}`;
            const patch = match[3] === undefined ? undefined : Number(match[3]);
            const split = patch === undefined
                ? undefined
                : PATCH_LINES.filter(line => line.minor === minor && line.from <= patch).at(-1);
            if (split) return split.id;
            if (isCoreVersionId(minor)) return minor;
        }
    }
    return DEFAULT_CORE_VERSION;
};

export const coreVersion = (id: CoreVersionId): CoreVersion =>
    CORE_VERSIONS.find(version => version.id === id)!;

/** Negative when `a` is older than `b`. */
export const compareCoreVersions = (a: CoreVersionId, b: CoreVersionId): number =>
    CORE_VERSIONS.findIndex(version => version.id === a) - CORE_VERSIONS.findIndex(version => version.id === b);

export const MINIMUM_CORE_VERSION: CoreVersionId = CORE_VERSIONS[0]!.id;
export const LATEST_CORE_VERSION: CoreVersionId = CORE_VERSIONS[CORE_VERSIONS.length - 1]!.id;
