import { describe, expect, it } from 'bun:test';
import { inboundNotes, topKeyOf, withoutPath } from './core-notes';
import { createDefaultInbound } from '../../../core/generators/endpoint-factory';
import { generateWireguardKeyPair } from '../../../core/generators/crypto';
import { CORE_VERSIONS } from '../../../core/xray/versions';

const kinds = (notes: ReturnType<typeof inboundNotes>) =>
    notes.map(note => note.kind === 'feature' ? `${note.status}:${note.feature.path}:${note.action}`
        : note.kind === 'value' ? `value:${note.set.path}=${note.value}`
            : note.kind === 'problem' ? `problem:${note.problem.kind}`
                : `conflict:${note.pair.alias}`);

describe('inboundNotes', () => {
    it('has nothing to say about what the factory builds, on any line', () => {
        for (const line of CORE_VERSIONS) {
            for (const protocol of ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'mixed', 'http', 'hysteria', 'tun', 'dokodemo-door', 'tunnel']) {
                expect(inboundNotes(createDefaultInbound(protocol), line.id)).toEqual([]);
            }
        }
    });

    it('says the WireGuard inbound the factory builds will not load until it has a key', () => {
        // This list used to end in 'wireguard' and expect silence for it. The
        // silence was the bug: the factory writes an empty secretKey, every
        // line refuses that (v26.7.28:infra/conf/wireguard.go:75-78), and
        // nothing here said so — the inbound looked finished and was not.
        for (const line of CORE_VERSIONS) {
            const made = createDefaultInbound('wireguard');
            expect(kinds(inboundNotes(made, line.id))).toEqual(['problem:secretKey.empty']);
            // The one thing wrong with it: given a key, there is nothing left to say.
            const keyed = { ...made, settings: { ...made.settings, secretKey: generateWireguardKeyPair().secretKey } };
            expect(inboundNotes(keyed, line.id)).toEqual([]);
        }
    });

    it('puts what stops the inbound being built ahead of a key that does nothing', () => {
        const notes = inboundNotes({
            protocol: 'wireguard', port: 51820,
            settings: { secretKey: '', workers: 2, peers: [{ publicKey: '' }], domainStrategy: 'AsIs' },
        }, '26.7');
        expect(kinds(notes)).toEqual([
            'problem:secretKey.empty',
            'problem:publicKey.empty',
            'value:settings.domainStrategy=AsIs',
            'absent:settings.workers:remove',
        ]);
    });

    it('calls allocate a key no line reads, and offers to remove it', () => {
        const notes = inboundNotes({ protocol: 'vless', port: 443, settings: { clients: [], decryption: 'none' }, allocate: { strategy: 'always' } }, '26.7');
        expect(kinds(notes)).toEqual(['absent:allocate:remove']);
        expect(notes[0]!.kind === 'feature' && notes[0]!.everywhere).toBe(true);
    });

    it('flags the Hysteria 1 keys the editor used to write', () => {
        const notes = inboundNotes({ protocol: 'hysteria', port: 443, settings: { version: 2, clients: [{ auth: 'x' }], up_mbps: 100, down_mbps: 100 } }, '26.9');
        expect(kinds(notes)).toEqual(['absent:settings.up_mbps:remove', 'absent:settings.down_mbps:remove']);
    });

    it('offers to rename a 26.7-only spelling on 26.3 rather than delete the users', () => {
        const notes = inboundNotes({ protocol: 'vless', port: 443, settings: { users: [{ id: 'a' }], decryption: 'none' } }, '26.3');
        expect(kinds(notes)).toEqual(['absent:settings.users:adopt']);
    });

    it('reports both spellings once, as a conflict', () => {
        const notes = inboundNotes({ protocol: 'vless', port: 443, settings: { clients: [], users: [{ id: 'a' }], decryption: 'none' } }, '26.3');
        expect(kinds(notes)).toEqual(['conflict:users']);
        expect(notes[0]!.kind === 'conflict' && notes[0]!.keyEmpty).toBe(true);
    });

    it('reports a value the line refuses, worst first', () => {
        const notes = inboundNotes({
            protocol: 'shadowsocks', port: 1, settings: { method: 'none', password: 'x' },
            sniffing: { enabled: true, ipsExcluded: ['10.0.0.0/8'] },
        }, '26.3');
        // "none" still works on 26.3; the exclusion list does not exist there.
        expect(kinds(notes)).toEqual(['absent:sniffing.ipsExcluded:remove']);
        // On 26.7 "none" stops the load, which outranks a key that does nothing.
        expect(kinds(inboundNotes({ protocol: 'shadowsocks', port: 1, settings: { method: 'none', password: 'x' }, allocate: {} }, '26.7')))
            .toEqual(['value:settings.method=none', 'absent:allocate:remove']);
    });

    it('leaves transport keys to the transport editor', () => {
        const notes = inboundNotes({ protocol: 'vless', port: 443, settings: { clients: [], decryption: 'none' }, streamSettings: { network: 'grpc' } }, '26.7');
        expect(notes).toEqual([]);
    });

    it('never offers to remove the protocol itself', () => {
        const notes = inboundNotes({ protocol: 'masque', port: 443, settings: {} }, '26.7');
        expect(kinds(notes)).toEqual(['rejected:protocol:none']);
    });
});

describe('withoutPath', () => {
    it('drops a key through arrays without touching the rest', () => {
        const before = { settings: { clients: [{ password: 'a', email: 'x' }, { auth: 'b' }], version: 2 } };
        expect(withoutPath(before, 'settings.clients[].password')).toEqual({ settings: { clients: [{ email: 'x' }, { auth: 'b' }], version: 2 } });
        expect(before.settings.clients[0]!.password).toBe('a');
    });

    it('drops a top-level key, and leaves a missing one alone', () => {
        expect(withoutPath({ allocate: {}, port: 1 }, 'allocate')).toEqual({ port: 1 });
        const same = { port: 1 };
        expect(withoutPath(same, 'sniffing.ipsExcluded')).toBe(same);
    });

    it('names the top-level key a path starts at', () => {
        expect(topKeyOf('settings.clients[].password')).toBe('settings');
        expect(topKeyOf('allocate')).toBe('allocate');
    });
});
