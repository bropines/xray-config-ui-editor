/**
 * Hand-written feature rows and value sets for the finalmask editors.
 *
 * Kept apart from features.ts so each editor area owns its own rows; they are
 * merged there and win over generated rows for the same place. Same rules as
 * the rest of the table: every row cites `tag:file:line`.
 *
 * These are the presence facts the finalmask form relies on that the
 * generated table does not carry. The per-mask key lists the form draws from
 * live in finalmask-rules.ts; its test holds them to these rows.
 */
import type { CoreFeature, CoreValueSet, FeatureStatus } from './features';
import type { CoreVersionId } from './index';

/** The 26.10 column follows 26.9 unless a row says otherwise — and a row says so wherever v26.10.10 differs. */
const s = (
    v263: FeatureStatus,
    v267: FeatureStatus,
    v269: FeatureStatus,
    v2610: FeatureStatus = v269,
): Record<CoreVersionId, FeatureStatus> =>
    ({ '26.3': v263, '26.7': v267, '26.9': v269, '26.10': v2610 });

/** finalmask is the same struct on either side, so every row is written for both. */
const bothSides = (row: Omit<CoreFeature, 'id' | 'scope'> & { id: string }): CoreFeature[] =>
    (['outbound', 'inbound'] as const).map(scope => ({ ...row, id: `${scope}.${row.id}`, scope }));

const FM = 'streamSettings.finalmask';

export const FINALMASK_FEATURES: CoreFeature[] = [
    ...bothSides({
        id: 'finalmask.quicParams.bbrProfile',
        path: `${FM}.quicParams.bbrProfile`,
        status: s('absent', 'accepted', 'accepted'),
        detail: 'The BBR profile arrived in 26.7; 26.3 has no such field and runs the standard profile.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:630', 'v26.7.28:infra/conf/transport_finalmask.go:933', 'v26.9.9:infra/conf/transport_finalmask.go:996', 'v26.10.10:infra/conf/transport_finalmask.go:1135'],
    }),
    // Two keys this editor used to write. QuicParamsConfig never had either:
    // the idle timeout is maxIdleTimeout, and there is no handshake timeout.
    ...bothSides({
        id: 'finalmask.quicParams.max_idle_timeout',
        path: `${FM}.quicParams.max_idle_timeout`,
        status: s('absent', 'absent', 'absent'),
        replacement: `${FM}.quicParams.maxIdleTimeout`,
        detail: 'Not a QuicParamsConfig key on any line; the idle timeout is maxIdleTimeout, in seconds.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:640', 'v26.7.28:infra/conf/transport_finalmask.go:941', 'v26.9.9:infra/conf/transport_finalmask.go:1004', 'v26.10.10:infra/conf/transport_finalmask.go:1143'],
    }),
    ...bothSides({
        id: 'finalmask.quicParams.handshake_timeout',
        path: `${FM}.quicParams.handshake_timeout`,
        status: s('absent', 'absent', 'absent'),
        detail: 'QuicParamsConfig has no handshake timeout on any line.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:630', 'v26.7.28:infra/conf/transport_finalmask.go:930', 'v26.9.9:infra/conf/transport_finalmask.go:993', 'v26.10.10:infra/conf/transport_finalmask.go:1132'],
    }),
    ...bothSides({
        id: 'finalmask.udp.xdns.resolvers',
        path: `${FM}.udp[type=xdns].settings.resolvers`,
        status: s('absent', 'accepted', 'accepted'),
        detail: 'The client-side resolver list arrived with the 26.7 xdns split; 26.3 read a single domain. 26.10 reads a list of {addrs} objects instead of strings.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1662', 'v26.7.28:infra/conf/transport_finalmask.go:699', 'v26.9.9:infra/conf/transport_finalmask.go:702', 'v26.10.10:infra/conf/transport_finalmask.go:807'],
    }),
    ...bothSides({
        id: 'finalmask.udp.xicmp.ips',
        path: `${FM}.udp[type=xicmp].settings.ips`,
        status: s('absent', 'accepted', 'accepted'),
        detail: 'xicmp peer addresses arrived in 26.7; every entry must be a plain IP or the config does not load.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1676', 'v26.7.28:infra/conf/transport_finalmask.go:800', 'v26.9.9:infra/conf/transport_finalmask.go:803', 'v26.10.10:infra/conf/transport_finalmask.go:945'],
    }),
    ...bothSides({
        id: 'finalmask.udp.realm.ipMode',
        path: `${FM}.udp[type=realm].settings.ipMode`,
        status: s('absent', 'absent', 'accepted'),
        detail: 'The realm IP mode arrived in 26.9; 26.7 ignores it.',
        evidence: ['v26.7.28:infra/conf/transport_finalmask.go:818', 'v26.9.9:infra/conf/transport_finalmask.go:825', 'v26.10.10:infra/conf/transport_finalmask.go:967'],
    }),
    ...bothSides({
        id: 'finalmask.udp.header-custom.mode',
        path: `${FM}.udp[type=header-custom].settings.mode`,
        status: s('absent', 'accepted', 'accepted'),
        detail: 'The UDP header-custom mode arrived in 26.7; 26.3 is always prefix-style.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1484', 'v26.7.28:infra/conf/transport_finalmask.go:505', 'v26.9.9:infra/conf/transport_finalmask.go:508', 'v26.10.10:infra/conf/transport_finalmask.go:603'],
    }),
];

/** What PraseByteSlice decodes a packet as; "" and "array" are the same thing. */
const NOISE_ITEM_TYPES = ['', 'array', 'str', 'hex', 'base64'];

export const FINALMASK_VALUE_SETS: CoreValueSet[] = [
    // Congestion takes "", reno, bbr, brutal and force-brutal on all three
    // lines (v26.3.27:transport_internet.go:1913, v26.9.9:transport_internet.go:245),
    // so it has no value set: nothing about it differs by line.
    {
        id: 'finalmask.quicParams.bbrProfile',
        scope: 'outbound',
        path: `${FM}.quicParams.bbrProfile`,
        // Lower-cased before the switch; "" is the standard profile.
        allowed: {
            '26.3': null,
            '26.7': ['', 'conservative', 'standard', 'aggressive'],
            '26.9': ['', 'conservative', 'standard', 'aggressive'],
            '26.10': ['', 'conservative', 'standard', 'aggressive'],
        },
        outside: 'rejected',
        detail: 'Any other profile fails the config with "unknown bbr profile".',
        evidence: ['v26.7.28:infra/conf/transport_internet.go:219', 'v26.7.28:infra/conf/transport_internet.go:226', 'v26.9.9:infra/conf/transport_internet.go:219', 'v26.10.10:infra/conf/transport_internet.go:245'],
    },
    {
        // PraseByteSlice lower-cases the type and answers "unknown type" to anything it does
        // not list (v26.3.27:transport_internet.go:1204-1233, v26.7.28:transport_finalmask.go:33-63,
        // v26.9.9:transport_finalmask.go:35-65), and a noise item hands it its own type. v26.10.10
        // looks for "exp" first and builds the item from a string expression instead
        // (transport_finalmask.go:317-332); header-custom items and transform args still go
        // through PraseByteSlice alone, so exp is a noise-item value only. A missing type is "".
        id: 'finalmask.udp.noise.item.type',
        scope: 'outbound',
        path: `${FM}.udp[type=noise].settings.noise[].type`,
        allowed: {
            '26.3': NOISE_ITEM_TYPES,
            '26.7': NOISE_ITEM_TYPES,
            '26.9': NOISE_ITEM_TYPES,
            '26.10': [...NOISE_ITEM_TYPES, 'exp'],
        },
        outside: 'rejected',
        detail: 'The type of a noise item picks how its packet is decoded; exp (26.10 only) takes a string expression such as <b 0xDEADBEEF><r 8><t>. Any other type fails the config with "unknown type".',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1232', 'v26.7.28:infra/conf/transport_finalmask.go:63', 'v26.9.9:infra/conf/transport_finalmask.go:65', 'v26.10.10:infra/conf/transport_finalmask.go:317', 'v26.10.10:infra/conf/transport_finalmask.go:340'],
    },
];
