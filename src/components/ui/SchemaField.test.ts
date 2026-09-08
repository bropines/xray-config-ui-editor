import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { getSchemaTypeAndDetails } from './SchemaField';
import { InboundProtocolSchema, OutboundProtocolSchema } from '../../core/xray/schemas/primitives';

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
});
