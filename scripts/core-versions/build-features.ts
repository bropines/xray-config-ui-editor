/**
 * Turn the per-tag findings into the feature table the app reads.
 *
 *   bun run scripts/core-versions/build-features.ts
 *
 * Reads findings/*.json — one file per area of infra/conf, each item a key or
 * value with its status on every supported tag and `tag:file:line` evidence —
 * and writes src/core/xray/versions/features.data.ts.
 *
 * Only presence-shaped findings become rows: a key that one line accepts and
 * another ignores or refuses. Constraints (ranges, required fields, formats)
 * and enum-valued findings are not mechanical to express, so they are written
 * by hand in features.ts, which also wins over a generated row for the same
 * path.
 *
 * Adding a core line: run inventory.ts over the new tag, have the findings
 * re-derived with the new tag's column, add the line to CORE_VERSIONS and to
 * TAG_TO_ID below, and rerun this. A line named by a patch (26.9.30) is a line
 * like the others here: every finding carries its own status for it and cites
 * where that was read — the generator refuses a finding that has none, so a
 * new column cannot default to a neighbour's by omission.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..', '..');
const FINDINGS = join(import.meta.dir, 'findings');
const OUT = join(ROOT, 'src', 'core', 'xray', 'versions', 'features.data.ts');

const TAG_TO_ID: Record<string, string> = {
    'v26.3.27': '26.3',
    'v26.7.28': '26.7',
    'v26.9.9': '26.9',
    'v26.9.30': '26.9.30',
    'v26.10.10': '26.10',
};
const TAGS = Object.keys(TAG_TO_ID);
const SPLIT_TAG = 'v26.9.30';

const PRESENCE_KINDS = new Set(['field', 'alias', 'rename', 'removed-feature', 'section']);

/** Second names the loader registers for the same config struct. */
const PROTOCOL_ALIASES: Record<string, string[]> = {
    'dokodemo-door': ['dokodemo-door', 'tunnel'],
    tunnel: ['tunnel', 'dokodemo-door'],
    socks: ['socks', 'mixed'],
    shadowsocks: ['shadowsocks', 'shadowsocks-2022'],
    freedom: ['freedom', 'direct'],
    blackhole: ['blackhole', 'block'],
};

/** What replaced a key, where the findings name it only in prose. */
const REPLACEMENTS: Record<string, string> = {
    'streamSettings.kcpSettings.header': 'a finalmask UDP mask (mkcp-legacy from 26.7, header-* on 26.3)',
    'streamSettings.kcpSettings.seed': 'a finalmask UDP mask (mkcp-legacy from 26.7, mkcp-aes128gcm on 26.3)',
    'streamSettings.kcpSettings.writeBufferSize': 'streamSettings.kcpSettings.maxSendingWindow',
    'streamSettings.hysteriaSettings.congestion': 'streamSettings.finalmask.quicParams.congestion',
    'streamSettings.hysteriaSettings.up': 'streamSettings.finalmask.quicParams.brutalUp',
    'streamSettings.hysteriaSettings.down': 'streamSettings.finalmask.quicParams.brutalDown',
    'streamSettings.hysteriaSettings.udphop': 'streamSettings.finalmask.udp udphop',
    'streamSettings.finalmask.quicParams.udpHop': 'streamSettings.finalmask.udp udphop',
    'streamSettings.tlsSettings.allowInsecure': 'streamSettings.tlsSettings.pinnedPeerCertSha256',
    'streamSettings.tlsSettings.verifyPeerCertInNames': 'streamSettings.tlsSettings.verifyPeerCertByName',
    'streamSettings.wsSettings.headers.host': 'streamSettings.wsSettings.host',
    'settings.ipsBlocked': 'settings.finalRules',
    'settings.noise': 'settings.noises',
    'settings.domainStrategy': 'settings.targetStrategy',
    'settings.nonIPQuery': 'settings.rules',
    'settings.blockTypes': 'settings.rules',
    reverse: 'VLESS reverse proxy (settings.reverse)',
    'settings.flow': 'VLESS with flow',
    'settings.clients[].flow': 'VLESS with flow',
};

/**
 * Keys the core refuses only for some values. Without these, "present"
 * would call a harmless `allowInsecure: false` or `transport: {}` a config
 * that will not load — and a critical finding blocks saving to the panel.
 */
const PRESENCE: Record<string, { value?: string; nonEmpty?: boolean }> = {
    'streamSettings.tlsSettings.allowInsecure': { value: 'true' },
    'settings.flow': { nonEmpty: true },
    'settings.clients[].flow': { nonEmpty: true },
    transport: { nonEmpty: true },
};

interface Row {
    id: string;
    scope: string;
    protocol?: string[];
    path: string;
    value?: string;
    nonEmpty?: boolean;
    status: Record<string, string>;
    replacement?: string;
    detail: string;
    evidence: string[];
}

const rows: Row[] = [];
const skipped: string[] = [];

const statusOf = (item: any): Record<string, string> | null => {
    const out: Record<string, string> = {};
    for (const tag of TAGS) {
        const value = item.status?.[tag];
        if (!['accepted', 'deprecated', 'absent', 'rejected'].includes(value)) return null;
        out[TAG_TO_ID[tag]!] = value;
    }
    return out;
};

const sentence = (text: string): string => {
    const first = String(text || '').split(/(?<=\.)\s/)[0]!.trim();
    return first.length > 220 ? `${first.slice(0, 217)}...` : first;
};

const push = (row: Omit<Row, 'id'>) => {
    const id = [row.scope, row.protocol?.[0] ?? '*', row.path].join(':');
    if (rows.some(existing => existing.id === id)) return;
    rows.push({ id, ...row, ...(PRESENCE[row.path] ?? {}) });
};

for (const area of ['protocols', 'transport', 'finalmask', 'toplevel']) {
    const findings = JSON.parse(readFileSync(join(FINDINGS, `${area}.json`), 'utf8'));
    for (const item of findings.items) {
        if (!PRESENCE_KINDS.has(item.kind)) continue;
        const status = statusOf(item);
        if (!status) { skipped.push(`${area}: ${item.path} (unreadable status)`); continue; }
        if (Object.values(status).every(value => value === 'accepted')) continue;

        // Two citations from the older tags, one from v26.9.30 and one from
        // the newest: the row has to say where its newest columns were read,
        // or nobody can check them.
        const cited: string[] = item.evidence ?? [];
        const newest = `${Object.keys(TAG_TO_ID).at(-1)}:`;
        const split = `${SPLIT_TAG}:`;
        const evidence = [
            ...cited.filter(entry => !entry.startsWith(newest) && !entry.startsWith(split)).slice(0, 2),
            ...cited.filter(entry => entry.startsWith(split)).slice(0, 1),
            ...cited.filter(entry => entry.startsWith(newest)).slice(0, 1),
        ];
        const detail = sentence(item.detail);
        let path: string = item.path;

        if (path.includes('{') || path.includes('=') && !path.includes('[')) {
            skipped.push(`${area}: ${path} (shape not expressible as one path)`);
            continue;
        }

        if (area === 'protocols') {
            const protocol = item.protocol === '*' ? undefined : (PROTOCOL_ALIASES[item.protocol] ?? [item.protocol]);
            const [head, last] = [path.slice(0, path.lastIndexOf('.') + 1), path.slice(path.lastIndexOf('.') + 1)];
            for (const key of last.split('|')) {
                const full = head + key;
                push({ scope: item.direction, protocol, path: full, status, replacement: REPLACEMENTS[full], detail, evidence });
            }
            continue;
        }

        if (area === 'transport' || area === 'finalmask') {
            if (!path.startsWith('streamSettings.')) { skipped.push(`${area}: ${path} (outside streamSettings)`); continue; }
            if (item.maskType) path = path.replace(/\.(udp|tcp)\[\]/, `.$1[type=${item.maskType}]`);
            for (const scope of ['outbound', 'inbound']) {
                push({ scope, path, status, replacement: REPLACEMENTS[item.path], detail, evidence });
            }
            continue;
        }

        // toplevel
        const prefixes: [string, string][] = [
            ['inbounds[].', 'inbound'],
            ['outbounds[].', 'outbound'],
            ['routing.rules[].', 'rule'],
            ['routing.balancers[].', 'balancer'],
            ['dns.servers[].', 'dnsServer'],
        ];
        const match = prefixes.find(([prefix]) => path.startsWith(prefix));
        if (path.startsWith('outbounds[protocol=')) { skipped.push(`${area}: ${path} (duplicate of a protocols finding)`); continue; }
        const scope = match ? match[1] : 'config';
        const inner = match ? path.slice(match[0].length) : path;
        push({ scope, path: inner, status, replacement: REPLACEMENTS[inner], detail, evidence });
    }
}

const literal = (value: unknown) => JSON.stringify(value);
const body = rows.map(row => [
    '    {',
    `        id: ${literal(row.id)},`,
    `        scope: ${literal(row.scope)},`,
    row.protocol ? `        protocol: ${literal(row.protocol)},` : null,
    `        path: ${literal(row.path)},`,
    row.value !== undefined ? `        value: ${literal(row.value)},` : null,
    row.nonEmpty ? '        nonEmpty: true,' : null,
    `        status: { '26.3': ${literal(row.status['26.3'])}, '26.7': ${literal(row.status['26.7'])}, '26.9': ${literal(row.status['26.9'])}, '26.9.30': ${literal(row.status['26.9.30'])}, '26.10': ${literal(row.status['26.10'])} },`,
    row.replacement ? `        replacement: ${literal(row.replacement)},` : null,
    `        detail: ${literal(row.detail)},`,
    `        evidence: ${literal(row.evidence)},`,
    '    },',
].filter(Boolean).join('\n')).join('\n');

writeFileSync(OUT, `// GENERATED by scripts/core-versions/build-features.ts from scripts/core-versions/findings.
// Do not edit by hand — change the findings or the generator, and rerun it.
// Hand-written rows live in features.ts and take precedence over these.
import type { CoreFeature } from './features';

export const GENERATED_FEATURES: CoreFeature[] = [
${body}
];
`);

console.log(`${rows.length} rows -> ${OUT}`);
if (skipped.length) console.log(`skipped ${skipped.length}:\n  ${skipped.join('\n  ')}`);
