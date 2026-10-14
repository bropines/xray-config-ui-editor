import { describe, expect, it } from 'bun:test';
import {
    effectiveOutboundsInterface,
    hasSystemRoutes,
    outboundsInterfaceValue,
    readOutboundsInterface,
} from './tun-outbounds-interface';

/**
 * The four things the key can be, from v26.7.28:infra/conf/tun.go:35-40 (the
 * same at v26.9.9, and v26.10.10:infra/conf/tun.go:67-72): a value that is
 * given is used as it is, an empty one included; one that is not given is
 * "auto" when routes are listed and nothing otherwise.
 */

describe('reading the key', () => {
    it('tells absent, null, empty, auto and a name apart', () => {
        expect(readOutboundsInterface({})).toBe('unset');
        expect(readOutboundsInterface(undefined)).toBe('unset');
        // null decodes to a nil pointer: the same as no key.
        expect(readOutboundsInterface({ autoOutboundsInterface: null })).toBe('unset');
        expect(readOutboundsInterface({ autoOutboundsInterface: '' })).toBe('off');
        expect(readOutboundsInterface({ autoOutboundsInterface: 'auto' })).toBe('auto');
        expect(readOutboundsInterface({ autoOutboundsInterface: 'eth0' })).toBe('named');
    });

    it('compares "auto" exactly, as the handler does', () => {
        // v26.7.28:proxy/tun/handler.go:98 — `== "auto"`; "Auto" is an interface called Auto.
        expect(readOutboundsInterface({ autoOutboundsInterface: 'Auto' })).toBe('named');
    });

    it('calls anything but text wrong: it fails the decode of the document', () => {
        for (const value of [true, false, 0, 1, [], {}]) {
            expect(readOutboundsInterface({ autoOutboundsInterface: value })).toBe('wrong');
        }
    });
});

describe('what the core ends up with', () => {
    const routes = { autoSystemRoutingTable: ['0.0.0.0/0'] };

    it('uses auto for an absent key once routes are listed, and nothing before', () => {
        expect(effectiveOutboundsInterface({})).toEqual({ kind: 'off' });
        expect(effectiveOutboundsInterface(routes)).toEqual({ kind: 'auto', implied: true });
        expect(effectiveOutboundsInterface({ ...routes, autoOutboundsInterface: null })).toEqual({ kind: 'auto', implied: true });
    });

    it('keeps an empty string empty even with routes: that is how it is switched off', () => {
        expect(effectiveOutboundsInterface({ ...routes, autoOutboundsInterface: '' })).toEqual({ kind: 'off' });
    });

    it('takes a given value as it is', () => {
        expect(effectiveOutboundsInterface({ autoOutboundsInterface: 'auto' })).toEqual({ kind: 'auto', implied: false });
        expect(effectiveOutboundsInterface({ ...routes, autoOutboundsInterface: 'wlan0' })).toEqual({ kind: 'named', name: 'wlan0' });
    });

    it('has nothing to say about a value the loader cannot decode', () => {
        expect(effectiveOutboundsInterface({ autoOutboundsInterface: true })).toBeUndefined();
    });

    it('counts only a non-empty list as routes', () => {
        expect(hasSystemRoutes({ autoSystemRoutingTable: [] })).toBe(false);
        expect(hasSystemRoutes({ autoSystemRoutingTable: 'x' })).toBe(false);
        expect(hasSystemRoutes({ autoSystemRoutingTable: ['10.0.0.0/8'] })).toBe(true);
    });
});

describe('writing the key', () => {
    it('writes off as the empty string and not set as no key at all', () => {
        expect(outboundsInterfaceValue('off')).toBe('');
        expect(outboundsInterfaceValue('unset')).toBeUndefined();
        expect(outboundsInterfaceValue('auto')).toBe('auto');
    });

    it('never turns a name still being typed into off', () => {
        expect(outboundsInterfaceValue('named', 'eth')).toBe('eth');
        expect(outboundsInterfaceValue('named', '')).toBeUndefined();
        expect(outboundsInterfaceValue('named')).toBeUndefined();
    });
});
