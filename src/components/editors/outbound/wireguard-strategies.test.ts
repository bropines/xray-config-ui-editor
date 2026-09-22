import { describe, expect, it } from 'bun:test';
import { WG_DOMAIN_STRATEGIES } from './wireguard-strategies';
import { WireguardDomainStrategySchema } from '../../../core/xray/schemas/primitives';

/**
 * The chooser and the validator have to agree, or one of them is lying to
 * whoever is looking at the config. They disagreed for the life of the field:
 * the chooser offered `AsIs` and `UseIP`, which Xray-core refuses outright.
 */

describe('the WireGuard domain strategies on offer', () => {
    const offered = WG_DOMAIN_STRATEGIES().map(o => o.value);
    const accepted = WireguardDomainStrategySchema.options as readonly string[];

    it('offers exactly what the schema accepts', () => {
        expect([...offered].sort()).toEqual([...accepted].sort());
    });

    it('puts the default first', () => {
        expect(offered[0]).toBe('ForceIP');
    });

    it('offers nothing the core would refuse', () => {
        for (const value of offered) {
            expect(WireguardDomainStrategySchema.safeParse(value).success).toBe(true);
        }
        // The two it used to offer, for the record.
        expect(WireguardDomainStrategySchema.safeParse('AsIs').success).toBe(false);
        expect(WireguardDomainStrategySchema.safeParse('UseIP').success).toBe(false);
    });
});
