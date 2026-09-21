import { describe, expect, it } from 'bun:test';
import { RealitySchema } from './schemas/transport/reality.schema';
import { TlsSchema } from './schemas/transport/tls.schema';
import {
    REALITY_FIELDS,
    TLS_FIELDS,
    auditDirections,
    hiddenKeysFor,
    foreignFieldsIn,
} from './field-directions';

const realityKeys = Object.keys(RealitySchema.shape);
const tlsKeys = Object.keys(TlsSchema.shape);

describe('field directions', () => {
    it('classifies every REALITY field in the schema', () => {
        // An undeclared field renders on both sides, which is how a server-only
        // key ends up offered on a client. A stale one points at a rename.
        const audit = auditDirections(realityKeys, REALITY_FIELDS);
        expect({ undeclared: audit.undeclared, stale: audit.stale }).toEqual({ undeclared: [], stale: [] });
    });

    it('classifies every TLS field in the schema', () => {
        const audit = auditDirections(tlsKeys, TLS_FIELDS);
        expect({ undeclared: audit.undeclared, stale: audit.stale }).toEqual({ undeclared: [], stale: [] });
    });

    it('leaves no field unreachable in the UI', () => {
        // Every declared field has to be rendered by some side at some
        // disclosure level, or it can only be set by hand-editing JSON.
        expect(auditDirections(realityKeys, REALITY_FIELDS).unreachable).toEqual([]);
        expect(auditDirections(tlsKeys, TLS_FIELDS).unreachable).toEqual([]);
    });

    it('keeps the two REALITY modes apart', () => {
        const inboundBasic = hiddenKeysFor(realityKeys, REALITY_FIELDS, 'inbound');
        const outboundBasic = hiddenKeysFor(realityKeys, REALITY_FIELDS, 'outbound');

        // spiderX is the client's crawl path: the server branch of
        // REALITYConfig.Build() never reads it.
        expect(inboundBasic).toContain('spiderX');
        expect(outboundBasic).not.toContain('spiderX');

        // privateKey is the server's half and must never be offered to a client.
        expect(outboundBasic).toContain('privateKey');
        expect(inboundBasic).not.toContain('privateKey');

        // shortIds (plural, server) vs shortId (singular, client).
        expect(outboundBasic).toContain('shortIds');
        expect(inboundBasic).toContain('shortId');
    });

    it('offers certificates to both sides, for mutual TLS', () => {
        const hidden = (side: 'inbound' | 'outbound') =>
            [...hiddenKeysFor(tlsKeys, TLS_FIELDS, side, 'basic'),
             ...hiddenKeysFor(tlsKeys, TLS_FIELDS, side, 'advanced')];
        // Hidden from the basic form on both sides, but reachable in Extended:
        // a client presenting a certificate is mutual TLS, not a mistake.
        expect(hidden('inbound').filter(k => k === 'certificates')).toHaveLength(1);
        expect(hidden('outbound').filter(k => k === 'certificates')).toHaveLength(1);
    });

    it('splits basic and advanced without dropping anything', () => {
        for (const side of ['inbound', 'outbound'] as const) {
            for (const [keys, fields] of [[realityKeys, REALITY_FIELDS], [tlsKeys, TLS_FIELDS]] as const) {
                const basic = keys.filter(k => !hiddenKeysFor(keys, fields, side, 'basic').includes(k));
                const advanced = keys.filter(k => !hiddenKeysFor(keys, fields, side, 'advanced').includes(k));
                // No field may appear in both disclosure levels at once.
                expect(basic.filter(k => advanced.includes(k))).toEqual([]);
            }
        }
    });
});

describe('fields already in the config', () => {
    it('shows a client field on a server when the config carries one', () => {
        // Panels copy fingerprint and spiderX from client templates into server
        // inbounds. Hiding a key that is in the data would leave it invisible,
        // unremovable, and still written back on every save.
        const value = { privateKey: 'k', spiderX: '/', fingerprint: 'firefox' };
        const hidden = hiddenKeysFor(realityKeys, REALITY_FIELDS, 'inbound', 'basic', value);
        expect(hidden).not.toContain('spiderX');
        expect(hidden).not.toContain('fingerprint');
        // Still hidden when the config does not mention them.
        expect(hiddenKeysFor(realityKeys, REALITY_FIELDS, 'inbound', 'basic', { privateKey: 'k' }))
            .toContain('spiderX');
    });

    it('treats empty values as absent', () => {
        for (const value of [{ spiderX: '' }, { serverNames: [] }, { show: undefined }]) {
            expect(hiddenKeysFor(realityKeys, REALITY_FIELDS, 'inbound', 'basic', value))
                .toContain('spiderX');
        }
    });

    it('names the fields this side will not read', () => {
        expect(foreignFieldsIn(REALITY_FIELDS, 'inbound', { spiderX: '/', fingerprint: 'firefox', privateKey: 'k' }).sort())
            .toEqual(['fingerprint', 'spiderX']);
        expect(foreignFieldsIn(REALITY_FIELDS, 'outbound', { privateKey: 'k', serverName: 'a.com' }))
            .toEqual(['privateKey']);
        expect(foreignFieldsIn(REALITY_FIELDS, 'inbound', { privateKey: 'k' })).toEqual([]);
    });
});
