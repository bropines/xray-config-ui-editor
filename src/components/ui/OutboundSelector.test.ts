import { describe, it, expect } from 'bun:test';
import { checkOutboundMatch } from './OutboundSelector';

describe('OutboundSelector — prefix & exact matching logic', () => {
    const availableTags = ['direct', 'block', 'vless-us-01', 'vless-us-02', 'vless-eu-01', 'trojan-jp'];

    it('identifies exact matches correctly', () => {
        const selected = ['direct', 'trojan-jp'];
        
        expect(checkOutboundMatch('direct', selected)).toEqual({
            exact: true,
            prefixMatch: false,
            pendingMatch: false,
            matchedPrefix: undefined
        });

        expect(checkOutboundMatch('trojan-jp', selected)).toEqual({
            exact: true,
            prefixMatch: false,
            pendingMatch: false,
            matchedPrefix: undefined
        });

        expect(checkOutboundMatch('block', selected)).toEqual({
            exact: false,
            prefixMatch: false,
            pendingMatch: false,
            matchedPrefix: undefined
        });
    });

    it('identifies prefix matches correctly', () => {
        const selected = ['vless-us-'];
        
        const res1 = checkOutboundMatch('vless-us-01', selected);
        expect(res1.exact).toBe(false);
        expect(res1.prefixMatch).toBe(true);
        expect(res1.matchedPrefix).toBe('vless-us-');

        const res2 = checkOutboundMatch('vless-eu-01', selected);
        expect(res2.exact).toBe(false);
        expect(res2.prefixMatch).toBe(false);
    });

    it('gives exact match priority over prefix match', () => {
        const selected = ['vless-', 'vless-us-01'];
        
        const resExact = checkOutboundMatch('vless-us-01', selected);
        expect(resExact.exact).toBe(true);
        expect(resExact.prefixMatch).toBe(false);

        const resPrefix = checkOutboundMatch('vless-us-02', selected);
        expect(resPrefix.exact).toBe(false);
        expect(resPrefix.prefixMatch).toBe(true);
        expect(resPrefix.matchedPrefix).toBe('vless-');
    });

    it('identifies pending match when user is actively typing a prefix', () => {
        const selected = ['direct'];
        const input = 'vless';

        const res = checkOutboundMatch('vless-us-01', selected, input);
        expect(res.exact).toBe(false);
        expect(res.prefixMatch).toBe(false);
        expect(res.pendingMatch).toBe(true);

        const resNonMatching = checkOutboundMatch('block', selected, input);
        expect(resNonMatching.pendingMatch).toBe(false);
    });

    it('does not flag pendingMatch if already exact or prefix matched', () => {
        const selected = ['vless-us-01', 'trojan-'];
        
        // exact match takes precedence over pending
        const resExact = checkOutboundMatch('vless-us-01', selected, 'vless');
        expect(resExact.exact).toBe(true);
        expect(resExact.pendingMatch).toBe(false);

        // prefix match takes precedence over pending
        const resPrefix = checkOutboundMatch('trojan-jp', selected, 'trojan');
        expect(resPrefix.prefixMatch).toBe(true);
        expect(resPrefix.pendingMatch).toBe(false);
    });
});
