import { describe, expect, it } from 'bun:test';
import { InboundProtocolSchema, OutboundProtocolSchema } from './schemas/primitives';
import { inboundSettingsSchemaFor } from './schemas/settings-by-protocol';
import { protocolsFor } from './versions/protocols';
import { FEATURES, VALUE_SETS } from './versions/features';
import { CORE_VERSIONS } from './versions';
import {
    createDefaultInbound,
    INBOUND_SPELLINGS,
    protocolsFor as buildableProtocols,
    supportsProtocol,
} from '../generators/endpoint-factory';
import { validateInbound } from '../validators';

/**
 * The inbound protocol lists, held to the loader's own.
 *
 * An inbound protocol is named in four places here — the enum the chooser
 * draws, the settings-schema table, the factory, and the feature rows — and
 * nothing kept them in step with each other or with the core. `mixed` is in
 * the loader on every supported line and was in none of the first three, so
 * it could not be created and an existing one opened with a blank chooser.
 *
 * The list below is `inboundConfigLoader`, which is the same twelve names on
 * the first three tags (v26.3.27:infra/conf/xray.go:25-38,
 * v26.7.28:infra/conf/xray.go:22-35, v26.9.9:infra/conf/xray.go:23-36) and
 * thirteen on v26.10.10, which adds `masque` (:24-38). It is written out rather
 * than read: a test that fetched the core would pass on a bad day and fail on
 * a good one.
 */
const REGISTERED = [
    'tunnel', 'dokodemo-door', 'http', 'shadowsocks', 'mixed', 'socks',
    'vless', 'vmess', 'trojan', 'wireguard', 'hysteria', 'tun',
];
const SINCE_2610 = ['masque'];

type Line = (typeof CORE_VERSIONS)[number]['id'];
const registeredOn = (line: Line) => (line === '26.10' ? [...REGISTERED, ...SINCE_2610] : REGISTERED);

const offeredOn = (line: Line) =>
    protocolsFor(line, 'inbound', InboundProtocolSchema.options);

describe('the chooser against the loader', () => {
    it('offers every inbound protocol the core registers, on every line', () => {
        for (const line of CORE_VERSIONS) {
            const missing = registeredOn(line.id).filter(protocol => !offeredOn(line.id).includes(protocol));
            expect(missing).toEqual([]);
        }
    });

    it('offers nothing the core does not register', () => {
        for (const line of CORE_VERSIONS) {
            const extra = offeredOn(line.id).filter(protocol => !registeredOn(line.id).includes(protocol));
            expect(extra).toEqual([]);
        }
    });
});

describe('every registered inbound protocol', () => {
    it.each(REGISTERED)('has a settings schema: %s', protocol => {
        // Without one the form validator and the JSON linter both skip the block.
        expect(inboundSettingsSchemaFor(protocol)).not.toBeNull();
    });

    it.each(REGISTERED)('can be built by the factory under its own name: %s', protocol => {
        expect(supportsProtocol('inbound', protocol)).toBe(true);
        const made = createDefaultInbound(protocol);
        expect(made.protocol).toBe(protocol);
        // ...and what it builds is something the form will save. Only shapes
        // are checked here; what the core refuses is the diagnostics' job.
        expect(validateInbound(made)).toEqual([]);
    });

    it('is the whole of what the factory builds, bar the one alias of ours', () => {
        // `shadowsocks-2022` is this app's name for shadowsocks with the 2022
        // ciphers — not a protocol the loader knows, and not offered.
        const extra = buildableProtocols('inbound').filter(protocol =>
            !REGISTERED.includes(protocol) && !SINCE_2610.includes(protocol) && protocol !== 'shadowsocks-2022');
        expect(extra).toEqual([]);
    });
});

describe('mixed', () => {
    it('is the socks inbound under another name, everywhere it is named', () => {
        // One struct in the core (SocksServerConfig), so one of everything here.
        expect(inboundSettingsSchemaFor('mixed')).toBe(inboundSettingsSchemaFor('socks'));
        expect(createDefaultInbound('mixed').settings).toEqual(createDefaultInbound('socks').settings);
        expect(INBOUND_SPELLINGS.mixed).toBe(INBOUND_SPELLINGS.socks);
    });

    it('is named by every version row that names socks', () => {
        const rows = [...FEATURES, ...VALUE_SETS].filter(row => row.scope === 'inbound' && row.protocol?.includes('socks'));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.filter(row => !row.protocol!.includes('mixed')).map(row => row.id)).toEqual([]);
    });

    it('does not exist as an outbound', () => {
        // outboundConfigLoader has no such name (v26.7.28:infra/conf/xray.go:37-52).
        expect(OutboundProtocolSchema.options as readonly string[]).not.toContain('mixed');
        expect(supportsProtocol('outbound', 'mixed')).toBe(false);
    });
});
