import { describe, expect, it } from 'bun:test';
import { protocolsFor } from './protocols';
import { CORE_VERSIONS } from './index';

/**
 * The list a protocol chooser draws. Two ways for it to be wrong, and both
 * have happened: offering a protocol the line refuses, and leaving out the
 * one the config already has — which shows as a chooser with nothing in it.
 */

const CANDIDATES = ['vless', 'socks', 'masque'] as const;

describe('protocolsFor', () => {
    it('leaves out a protocol the line does not register', () => {
        // masque is registered from v26.9.30 on (inbound.protocol.masque).
        for (const line of CORE_VERSIONS) {
            const expected = line.id === '26.9.30' || line.id === '26.10' ? ['vless', 'socks', 'masque'] : ['vless', 'socks'];
            expect(protocolsFor(line.id, 'inbound', CANDIDATES)).toEqual(expected);
            expect(protocolsFor(line.id, 'outbound', CANDIDATES)).toEqual(expected);
        }
    });

    it('keeps a refused one the config already uses, where the list had it', () => {
        expect(protocolsFor('26.7', 'inbound', CANDIDATES, 'masque')).toEqual(['vless', 'socks', 'masque']);
    });

    it('lists a protocol nothing here knows when the config uses it', () => {
        // This is how `mixed` went missing: registered by every core, absent
        // from the candidates, and so dropped from under an inbound that had it.
        expect(protocolsFor('26.7', 'inbound', CANDIDATES, 'mixed')).toEqual(['vless', 'socks', 'mixed']);
        expect(protocolsFor('26.9', 'outbound', ['vless'], 'direct')).toEqual(['vless', 'direct']);
    });

    it('adds nothing for a protocol that is already listed, or for none', () => {
        expect(protocolsFor('26.7', 'inbound', CANDIDATES, 'socks')).toEqual(['vless', 'socks']);
        expect(protocolsFor('26.7', 'inbound', CANDIDATES, undefined)).toEqual(['vless', 'socks']);
        expect(protocolsFor('26.7', 'inbound', CANDIDATES, '')).toEqual(['vless', 'socks']);
    });
});
