import { describe, expect, it } from 'bun:test';
import { inboundSettingsSchemaFor, outboundSettingsSchemaFor } from './settings-by-protocol';

/**
 * A settings schema is what the JSON editor autocompletes from and what the
 * form derives its fields from, so a key that is not here is a field nobody
 * can reach except by typing it blind — and a key the core does not have is a
 * field that does nothing.
 *
 * The expectations below are the json tags of the matching struct in
 * `infra/conf`, named per block. They are written out rather than fetched: a
 * test that reads the core over the network would pass on a bad day and fail
 * on a good one.
 */

const keysOf = (schema: unknown): string[] => {
    const shape = (schema as any)?.shape;
    if (!shape) throw new Error('not an object schema');
    return Object.keys(typeof shape === 'function' ? shape() : shape).sort();
};

const outboundKeys = (protocol: string) => keysOf(outboundSettingsSchemaFor(protocol));
const inboundKeys = (protocol: string) => keysOf(inboundSettingsSchemaFor(protocol));

describe('masque', () => {
    // MasqueClientConfig: address, port, remoteDNS
    it('outbound has the three fields the core reads, flat', () => {
        expect(outboundKeys('masque')).toEqual(['address', 'port', 'remoteDNS']);
    });

    // MasqueServerConfig: users, clients, address, mtu
    it('inbound has the pool, the users and the mtu', () => {
        expect(inboundKeys('masque')).toEqual(['address', 'clients', 'mtu', 'users']);
    });

    it('holds the core to its own mtu range', () => {
        const schema = inboundSettingsSchemaFor('masque')!;
        expect(schema.safeParse({ mtu: 1279 }).success).toBe(false);
        expect(schema.safeParse({ mtu: 65536 }).success).toBe(false);
        expect(schema.safeParse({ mtu: 1280 }).success).toBe(true);
        expect(schema.safeParse({ mtu: 1500 }).success).toBe(true);
    });
});

describe('freedom', () => {
    // FreedomConfig: targetStrategy, domainStrategy, redirect, userLevel,
    // fragment, noise, noises, proxyProtocol, ipsBlocked, finalRules
    it('has every field the core declares', () => {
        expect(outboundKeys('freedom')).toEqual([
            'domainStrategy', 'finalRules', 'fragment', 'ipsBlocked', 'noise',
            'noises', 'proxyProtocol', 'redirect', 'targetStrategy', 'userLevel',
        ]);
    });

    it('takes the noise types the core takes, and no others', () => {
        const schema = outboundSettingsSchemaFor('freedom')!;
        for (const type of ['rand', 'str', 'hex', 'base64']) {
            expect(schema.safeParse({ noises: [{ type }] }).success).toBe(true);
        }
        // "Invalid packet, only rand/str/hex/base64 are supported"
        expect(schema.safeParse({ noises: [{ type: 'random' }] }).success).toBe(false);
    });

    it('takes the applyTo values the core takes, and no others', () => {
        const schema = outboundSettingsSchemaFor('freedom')!;
        for (const applyTo of ['ip', 'ipv4', 'ipv6', 'all']) {
            expect(schema.safeParse({ noises: [{ applyTo }] }).success).toBe(true);
        }
        // "Invalid applyTo, only ip/ipv4/ipv6 are supported"
        expect(schema.safeParse({ noises: [{ applyTo: 'domain' }] }).success).toBe(false);
    });

    it('knows fragment.maxSplit, which had no way of being written before', () => {
        const schema = outboundSettingsSchemaFor('freedom')!;
        expect(keysOf((schema as any).shape.fragment.unwrap())).toEqual(
            ['interval', 'length', 'maxSplit', 'packets'],
        );
    });
});

describe('shadowsocks', () => {
    // ShadowsocksClientConfig from 26.7: address, port, level, email, method,
    // password, servers. 26.3 also has uot/uotVersion, flat and in servers[]
    // (v26.3.27:infra/conf/shadowsocks.go:168-169 and :179-180); the version
    // table knows both, the schema declares the server-entry one only.
    it('does not declare uot at the top level, though 26.3 reads one there', () => {
        const keys = outboundKeys('shadowsocks');
        expect(keys).not.toContain('uot');
        expect(keys).not.toContain('uotVersion');
        expect(keys).not.toContain('UoTVersion');
    });

    it('spells the legacy one the way the core did, inside a server entry', () => {
        const schema = outboundSettingsSchemaFor('shadowsocks')!;
        const server = keysOf((schema as any).shape.servers.unwrap().element);
        expect(server).toContain('uot');
        expect(server).toContain('uotVersion');
        expect(server).not.toContain('UoTVersion');
    });
});

describe('loopback and blackhole', () => {
    it('loopback is inboundTag and sniffing, and nothing else', () => {
        expect(outboundKeys('loopback')).toEqual(['inboundTag', 'sniffing']);
    });

    it('blackhole takes the custom response the core decodes as base64', () => {
        const schema = outboundSettingsSchemaFor('blackhole')!;
        expect(schema.safeParse({ response: { type: 'custom', customResponseData: 'aGk=' } }).success).toBe(true);
        // "unknown blackhole response: ..."
        expect(schema.safeParse({ response: { type: 'teapot' } }).success).toBe(false);
    });
});
