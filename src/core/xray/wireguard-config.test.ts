import { describe, expect, it } from 'bun:test';
import {
    addressIssues,
    allowedIpIssues,
    keyShape,
    prefixOf,
    reservedIssue,
} from './wireguard-config';
import { generateWireguardKeyPair } from '../generators/crypto';

/**
 * What an inbound and an outbound judge the same way. Each side words it for
 * itself (wireguard-inbound.test.ts, wireguard-outbound.test.ts); these hold
 * the decisions underneath.
 */

describe('a key', () => {
    it('is fine at 32 bytes, in base64 or hex', () => {
        expect(keyShape(generateWireguardKeyPair().secretKey)).toEqual({ ok: true });
        expect(keyShape('ab'.repeat(32))).toEqual({ ok: true });
    });

    it('is undecodable, or the wrong size, and the two are told apart', () => {
        expect(keyShape('not a key!')).toEqual({ ok: false, reason: 'invalid' });
        expect(keyShape(5)).toEqual({ ok: false, reason: 'invalid' });
        expect(keyShape('AAAA')).toEqual({ ok: false, reason: 'length', bytes: 3 });
    });
});

describe('a prefix', () => {
    it('is an address, a slash and a length that fits the family', () => {
        expect(prefixOf('10.0.0.1/24')).toEqual({ family: 4, bits: 24 });
        expect(prefixOf('fd00::1/128')).toEqual({ family: 6, bits: 128 });
        for (const bad of ['10.0.0.1', '10.0.0.1/33', '10.0.0.1/024', 'fd00::1/129', 'fe80::1%eth0/64', '/24', 'x/24']) {
            expect(prefixOf(bad)).toBeNull();
        }
    });
});

describe('interface addresses', () => {
    it('are an address or a prefix; only 26.3 insists on one host', () => {
        expect(addressIssues(['10.0.0.1', '10.0.0.1/32', 'fd00::1/128', '10.0.0.1/24'])).toEqual([]);
        expect(addressIssues(['10.0.0.1/24'], '26.7')).toEqual([]);
        expect(addressIssues(['10.0.0.1/24', 'fd00::1/64', '10.0.0.1/32'], '26.3')).toEqual([
            { value: '10.0.0.1/24', why: 'not-host', host: '10.0.0.1/32' },
            { value: 'fd00::1/64', why: 'not-host', host: 'fd00::1/128' },
        ]);
    });

    it('are never a name, a blank, or anything but a string', () => {
        expect(addressIssues(['wg.example.com', '', 5], '26.9').map(issue => [issue.value, issue.why])).toEqual([
            ['wg.example.com', 'not-ip'], ['', 'not-ip'], ['5', 'not-ip'],
        ]);
    });
});

describe('allowed IPs', () => {
    it('are networks; a bare address is offered as a network of one', () => {
        expect(allowedIpIssues(['0.0.0.0/0', '::/0', '10.0.0.0/8'])).toEqual([]);
        expect(allowedIpIssues(['10.0.0.2', 'fd00::2', 'home.example/24'])).toEqual([
            { value: '10.0.0.2', example: '10.0.0.2/32' },
            { value: 'fd00::2', example: 'fd00::2/128' },
            { value: 'home.example/24' },
        ]);
    });
});

describe('reserved', () => {
    it('is empty or three bytes, as a list or as base64', () => {
        for (const ok of [undefined, null, [], [0, 0, 0], [255, 0, 1], 'AAAA', '', 5, {}]) expect(reservedIssue(ok)).toBeNull();
        for (const bad of [[1], [1, 2], [1, 2, 3, 4], 'AAA=']) expect(reservedIssue(bad)).toBe('length');
    });

    it('holds bytes: a whole number from 0 to 255 in every slot', () => {
        for (const bad of [[0, 0, 256], [0, 0, -1], [0, 0, 1.5], [0, 0, '0'], [0, 0, null], [999]]) {
            expect(reservedIssue(bad)).toBe('range');
        }
    });

    it('leaves a string that is not base64 to the decoder, which atob is too forgiving to judge', () => {
        expect(reservedIssue('***')).toBeNull();
    });
});
