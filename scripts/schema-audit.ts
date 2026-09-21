/**
 * Compares the hand-written zod schemas against the types generated from
 * Xray-core's own `infra/conf`, and reports what has drifted apart.
 *
 * The zod schemas are what the UI builds its forms from, so a field that only
 * exists in the generated types is a field nobody can set without editing raw
 * JSON. A field that only exists in the schema is usually a rename upstream
 * that was never followed here.
 *
 * Everything is `.passthrough()`, so neither case breaks a config — which is
 * exactly why this drifts silently and needs a report. Run with
 * `bun run schema:audit`.
 */
import { readFileSync } from 'fs';
import { z } from 'zod';

import { RealitySchema } from '../src/core/xray/schemas/transport/reality.schema';
import { TlsSchema } from '../src/core/xray/schemas/transport/tls.schema';
import { InboundSchema, SniffingSchema, AllocateSchema } from '../src/core/xray/schemas/inbound.schema';
import { OutboundSchema, MuxSchema, ProxySettingsSchema } from '../src/core/xray/schemas/outbound.schema';
import { VlessInboundSettingsSchema } from '../src/core/xray/schemas/inbounds/vless.inbound';
import { VlessOutboundSettingsSchema } from '../src/core/xray/schemas/outbounds/vless.outbound';
import { VmessInboundSettingsSchema } from '../src/core/xray/schemas/inbounds/vmess.inbound';
import { VmessOutboundSettingsSchema } from '../src/core/xray/schemas/outbounds/vmess.outbound';
import { TrojanInboundSettingsSchema } from '../src/core/xray/schemas/inbounds/trojan.inbound';
import { TrojanOutboundSettingsSchema } from '../src/core/xray/schemas/outbounds/trojan.outbound';
import { ShadowsocksInboundSettingsSchema } from '../src/core/xray/schemas/inbounds/shadowsocks.inbound';
import { ShadowsocksOutboundSettingsSchema } from '../src/core/xray/schemas/outbounds/shadowsocks.outbound';

/** Schema ↔ generated-interface pairs. */
const PAIRS: { label: string; schema: z.ZodObject<any>; iface: string }[] = [
    { label: 'REALITY', schema: RealitySchema, iface: 'REALITYConfig' },
    { label: 'TLS', schema: TlsSchema, iface: 'TLSConfig' },
    { label: 'Sniffing', schema: SniffingSchema, iface: 'SniffingConfig' },
    { label: 'Allocate', schema: AllocateSchema, iface: 'InboundDetourAllocationConfig' },
    { label: 'Mux', schema: MuxSchema, iface: 'MuxConfig' },
    { label: 'ProxySettings', schema: ProxySettingsSchema, iface: 'ProxyConfig' },
    { label: 'VLESS inbound', schema: VlessInboundSettingsSchema, iface: 'VLessInboundConfig' },
    { label: 'VLESS outbound', schema: VlessOutboundSettingsSchema, iface: 'VLessOutboundConfig' },
    { label: 'VMess inbound', schema: VmessInboundSettingsSchema, iface: 'VMessInboundConfig' },
    { label: 'VMess outbound', schema: VmessOutboundSettingsSchema, iface: 'VMessOutboundConfig' },
    { label: 'Trojan inbound', schema: TrojanInboundSettingsSchema, iface: 'TrojanServerConfig' },
    { label: 'Trojan outbound', schema: TrojanOutboundSettingsSchema, iface: 'TrojanClientConfig' },
    { label: 'Shadowsocks inbound', schema: ShadowsocksInboundSettingsSchema, iface: 'ShadowsocksServerConfig' },
    { label: 'Shadowsocks outbound', schema: ShadowsocksOutboundSettingsSchema, iface: 'ShadowsocksClientConfig' },
    { label: 'Inbound', schema: InboundSchema, iface: 'InboundDetourConfig' },
    { label: 'Outbound', schema: OutboundSchema, iface: 'OutboundDetourConfig' },
];

/**
 * Differences that are correct and should stay.
 *
 * The generated types are produced by scraping Go structs, which is lossy: a
 * pointer-to-struct whose JSON name differs from the field name can be dropped
 * entirely. `allocate` is one of those — it exists in the core, the scraper
 * just did not carry it over. Keeping a reason next to each entry is what stops
 * this list from becoming a way to silence the report.
 */
const EXPECTED: Record<string, Record<string, string>> = {
    'VLESS inbound': { testseed: 'Upstream test hook, not user configuration.' },
    'VLESS outbound': {
        testpre: 'Upstream test hook, not user configuration.',
        testseed: 'Upstream test hook, not user configuration.',
    },
    'Shadowsocks outbound': {
        uot: 'Exists per-server in the core; kept flat here for the single-server form.',
        UoTVersion: 'Exists per-server in the core; kept flat here for the single-server form.',
    },
    Inbound: { allocate: 'In the core as InboundDetourConfig.Allocation; the type scraper drops it.' },
};

const types = readFileSync('src/core/xray-config.d.ts', 'utf8');

/** Field names of one interface in the generated types. */
const interfaceFields = (name: string): string[] | null => {
    const match = types.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
    if (!match) return null;
    return [...match[1]!.matchAll(/^\s{4}([A-Za-z_][\w]*)\??:/gm)].map(m => m[1]!);
};

let missingTotal = 0;
let extraTotal = 0;
const notFound: string[] = [];

for (const { label, schema, iface } of PAIRS) {
    const generated = interfaceFields(iface);
    if (!generated) {
        notFound.push(`${label} → ${iface}`);
        continue;
    }
    const declared = Object.keys(schema.shape);
    const expected = EXPECTED[label] ?? {};
    const missing = generated.filter(f => !declared.includes(f) && !(f in expected));
    const extra = declared.filter(f => !generated.includes(f) && !(f in expected));
    if (!missing.length && !extra.length) continue;

    console.log(`\n### ${label}  (${iface})`);
    if (missing.length) {
        console.log(`  in xray-core, not in the schema — unreachable in the UI:`);
        for (const f of missing) console.log(`    - ${f}`);
        missingTotal += missing.length;
    }
    if (extra.length) {
        console.log(`  in the schema, not in xray-core — renamed or removed upstream:`);
        for (const f of extra) console.log(`    + ${f}`);
        extraTotal += extra.length;
    }
}

if (notFound.length) {
    console.log(`\n### no matching interface in the generated types`);
    for (const line of notFound) console.log(`  ? ${line}`);
}

console.log(
    `\n${PAIRS.length - notFound.length} pairs compared · ${missingTotal} fields missing from schemas · `
    + `${extraTotal} fields not in xray-core · ${notFound.length} unmatched`,
);
