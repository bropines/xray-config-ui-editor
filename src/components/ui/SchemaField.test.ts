import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { getSchemaTypeAndDetails } from './schema-introspection';
import { InboundProtocolSchema, OutboundProtocolSchema } from '../../core/xray/schemas/primitives';
import {
    ApiSchema,
    DnsSchema,
    DnsServerObjectSchema,
    InboundSchema,
    LogSchema,
    ObservatorySchema,
    OutboundSchema,
    RealitySchema,
    SniffingSchema,
    TlsSchema,
    TunInboundSettingsSchema,
} from '../../core/xray/schemas';
import { FakeDnsPoolSchema } from '../../core/xray/schemas/fakedns.schema';
import {
    BalancerSchema,
    CostObjectSchema,
    RoutingRuleSchema,
    StrategySettingsSchema,
    WebhookObjectSchema,
} from '../../core/xray/schemas/routing.schema';
import { PingConfigSchema } from '../../core/xray/schemas/observatory.schema';
import { LevelPolicySchema, SystemPolicySchema } from '../../core/xray/schemas/policy.schema';
import { CertificateObjectSchema } from '../../core/xray/schemas/transport/tls.schema';

describe('getSchemaTypeAndDetails', () => {
    it('correctly extracts enum options from ZodUnion with ZodString (inbound protocol pattern)', () => {
        const schema = z.union([InboundProtocolSchema, z.string()]);
        const details = getSchemaTypeAndDetails(schema);

        expect(details.type).toBe('enum');
        expect(details.options).toEqual(InboundProtocolSchema.options);
        expect(details.options).toContain('vless');
        expect(details.options).toContain('shadowsocks');
    });

    it('correctly extracts enum options from OutboundProtocolSchema union', () => {
        const schema = z.union([OutboundProtocolSchema, z.string()]);
        const details = getSchemaTypeAndDetails(schema);

        expect(details.type).toBe('enum');
        expect(details.options).toEqual(OutboundProtocolSchema.options);
        expect(details.options).toContain('freedom');
        expect(details.options).toContain('blackhole');
    });

    it('extracts literal values when union contains only literals', () => {
        const schema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
        const details = getSchemaTypeAndDetails(schema);

        expect(details.type).toBe('enum');
        expect(details.options).toEqual(['0', '1', '2']);
    });

    it('falls back to string when union has plain string and numbers', () => {
        const schema = z.union([z.number(), z.string()]);
        const details = getSchemaTypeAndDetails(schema);

        expect(details.type).toBe('string');
    });

    it('reads a record as a record, not as something unrecognised', () => {
        // echSockopt, webhook headers, protocol settings: a map is an object
        // to the core, and "unknown" used to mean "text input".
        expect(getSchemaTypeAndDetails(z.record(z.string(), z.unknown())).type).toBe('record');
        expect(getSchemaTypeAndDetails(z.record(z.string(), z.string()).optional()).type).toBe('record');
    });

    it('does not fall back to string when a union also holds a structure', () => {
        // A text box can hold one branch of `"url" | { url }` and destroys the other.
        expect(getSchemaTypeAndDetails(z.union([z.string(), z.object({ url: z.string() })])).type).toBe('unknown');
        expect(getSchemaTypeAndDetails(z.union([z.string(), z.array(z.string())])).type).toBe('unknown');
        expect(getSchemaTypeAndDetails(z.union([z.number(), z.record(z.string(), z.string())])).type).toBe('unknown');
    });

    it('still reads a union of structures as the first of them', () => {
        const details = getSchemaTypeAndDetails(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]));
        expect(details.type).toBe('object');
    });

    it('leaves the scalar unions the forms rely on alone', () => {
        // port: number | string; an enum widened with string; a duration.
        expect(getSchemaTypeAndDetails(z.union([z.number(), z.string()])).type).toBe('string');
        expect(getSchemaTypeAndDetails(z.union([z.enum(['a', 'b']), z.string()])).type).toBe('enum');
        expect(getSchemaTypeAndDetails(z.array(z.union([z.string(), z.number()]))).type).toBe('array');
    });
});

/**
 * Every schema a form is built from, walked for the keys a text input cannot
 * hold. The list is the point: a key added to one of these schemas as an
 * object lands here, and the test under it says what the form will do with it.
 */
describe('object-typed keys in the schemas the forms use', () => {
    const SCHEMAS: Record<string, z.ZodObject<any>> = {
        FakeDnsPoolSchema, DnsSchema, DnsServerObjectSchema, InboundSchema, SniffingSchema,
        TunInboundSettingsSchema, OutboundSchema, BalancerSchema, StrategySettingsSchema,
        RoutingRuleSchema, WebhookObjectSchema, ApiSchema, PingConfigSchema, LogSchema,
        ObservatorySchema, SystemPolicySchema, LevelPolicySchema, RealitySchema, TlsSchema,
        // Reached through the list-of-objects editor, one form per entry.
        CertificateObjectSchema, CostObjectSchema,
    };

    /** What SchemaField draws for a key of this kind. */
    const drawnAs = (schema: z.ZodTypeAny): string => {
        const details = getSchemaTypeAndDetails(schema);
        if (details.type !== 'array') return details.type;
        const inner = details.innerSchema ? getSchemaTypeAndDetails(details.innerSchema).type : 'string';
        return `array<${inner}>`;
    };

    const structuredKeys = () => {
        const found: Record<string, string> = {};
        for (const [name, schema] of Object.entries(SCHEMAS)) {
            for (const [key, field] of Object.entries(schema.shape)) {
                const drawn = drawnAs(field as z.ZodTypeAny);
                if (/object|record|unknown|array<array>/.test(drawn)) found[`${name}.${key}`] = drawn;
            }
        }
        return found;
    };

    it('are exactly these, and none of them is read as text', () => {
        expect(structuredKeys()).toEqual({
            // JSON box that takes a list.
            'DnsSchema.servers': 'array<unknown>',
            // JSON box that takes an object.
            'DnsSchema.hosts': 'record',
            'InboundSchema.settings': 'record',
            'OutboundSchema.settings': 'record',
            'RoutingRuleSchema.attrs': 'record',
            'WebhookObjectSchema.headers': 'record',
            'InboundSchema.streamSettings': 'object',
            'InboundSchema.sniffing': 'object',
            'OutboundSchema.streamSettings': 'object',
            'OutboundSchema.proxySettings': 'object',
            'OutboundSchema.mux': 'object',
            'BalancerSchema.strategy': 'object',
            // Its own form in RuleEditor. Never a bare string: the core decodes it
            // into a struct (v26.7.28:infra/conf/router.go:151-157).
            'RoutingRuleSchema.webhook': 'object',
            // Their own editors in TransportSettings; the JSON box without them.
            'RealitySchema.limitFallbackUpload': 'object',
            'RealitySchema.limitFallbackDownload': 'object',
            'TlsSchema.echSockopt': 'record',
            // One form per entry, from the entry's own shape.
            'TlsSchema.certificates': 'array<object>',
            'StrategySettingsSchema.costs': 'array<object>',
        });
    });

    it('leave no key in any of these schemas that the form cannot name a control for', () => {
        const kinds = new Set<string>();
        for (const schema of Object.values(SCHEMAS)) {
            for (const field of Object.values(schema.shape)) kinds.add(drawnAs(field as z.ZodTypeAny));
        }
        expect([...kinds].sort()).toEqual([
            'array<enum>', 'array<object>', 'array<string>', 'array<unknown>',
            'boolean', 'enum', 'number', 'object', 'record', 'string',
        ]);
    });
});
