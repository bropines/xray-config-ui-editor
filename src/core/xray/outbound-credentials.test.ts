import { describe, expect, it } from 'bun:test';
import {
    hasLogin,
    loginProblem,
    readCredentials,
    serverPath,
    serverShape,
    withCredentials,
} from './outbound-credentials';

/**
 * A SOCKS or HTTP outbound's login had no field in the form at all — only a
 * "UUID / ID" box bound to nothing — and the form wrote `servers[0]` whichever
 * shape the config used, which on a flat config is a key the core never
 * reads. Both shapes are read and written where the core looks for them.
 */

const servers = (server: any) => ({ protocol: 'socks', settings: { servers: [server] } });
const flat = (settings: any) => ({ protocol: 'socks', settings });

describe('which shape a config uses', () => {
    it('is flat as soon as settings.address is there, as the core decides it', () => {
        // socks.go:89 — `if v.Address != nil` overwrites `servers` wholesale.
        expect(serverShape(flat({ address: 'p.example', port: 1080 }))).toBe('flat');
        expect(serverShape(flat({ address: 'p.example', servers: [{ address: 'other' }] }))).toBe('flat');
    });

    it('is the servers list otherwise', () => {
        expect(serverShape(servers({ address: 'p.example', port: 1080 }))).toBe('servers');
        expect(serverShape({ protocol: 'socks' })).toBe('servers');
        expect(serverShape(null)).toBe('servers');
    });

    it('points the address fields at the object the core reads', () => {
        expect(serverPath(flat({ address: 'p.example' }))).toEqual(['settings']);
        expect(serverPath(servers({ address: 'p.example' }))).toEqual(['settings', 'servers', 0]);
    });

    it('applies to socks and http only', () => {
        expect(hasLogin('socks')).toBe(true);
        expect(hasLogin('http')).toBe(true);
        expect(hasLogin('hysteria')).toBe(false);
        expect(hasLogin('vless')).toBe(false);
    });
});

describe('reading a login', () => {
    it('reads it from wherever the shape keeps it', () => {
        expect(readCredentials(flat({ address: 'p', user: 'alice', pass: 's3cret' }))).toEqual({ user: 'alice', pass: 's3cret' });
        expect(readCredentials(servers({ address: 'p', users: [{ user: 'bob', pass: 'pw' }] }))).toEqual({ user: 'bob', pass: 'pw' });
    });

    it('reads no login as two empty strings', () => {
        expect(readCredentials(servers({ address: 'p' }))).toEqual({ user: '', pass: '' });
        expect(readCredentials({})).toEqual({ user: '', pass: '' });
    });

    it('does not read the list when the config is flat, since the core will not either', () => {
        const both = flat({ address: 'p', servers: [{ users: [{ user: 'ignored', pass: 'x' }] }] });
        expect(readCredentials(both)).toEqual({ user: '', pass: '' });
    });
});

describe('writing a login', () => {
    it('writes user and pass beside a flat address', () => {
        const next = withCredentials(flat({ address: 'p', port: 1080 }), { user: 'alice', pass: 'pw' }) as any;
        expect(next.settings).toEqual({ address: 'p', port: 1080, user: 'alice', pass: 'pw' });
    });

    it('writes one account into servers[0], keeping the server it is on', () => {
        const next = withCredentials(servers({ address: 'p', port: 1080 }), { user: 'alice', pass: 'pw' }) as any;
        expect(next.settings.servers).toEqual([{ address: 'p', port: 1080, users: [{ user: 'alice', pass: 'pw' }] }]);
    });

    it('keeps what else the account holds', () => {
        const outbound = servers({ address: 'p', users: [{ user: 'old', pass: 'old', level: 1, email: 'a@b' }] });
        const next = withCredentials(outbound, { user: 'new', pass: 'pw' }) as any;
        expect(next.settings.servers[0].users).toEqual([{ user: 'new', pass: 'pw', level: 1, email: 'a@b' }]);
    });

    it('takes the login out entirely when both boxes are empty', () => {
        // An empty `users` entry is still an account: the client would offer
        // username/password authentication with nothing in it.
        const listed = withCredentials(servers({ address: 'p', users: [{ user: 'a', pass: 'b' }] }), { user: '', pass: '' }) as any;
        expect(listed.settings.servers[0]).toEqual({ address: 'p' });
        const flatOne = withCredentials(flat({ address: 'p', user: 'a', pass: 'b' }), { user: '', pass: '' }) as any;
        expect(flatOne.settings).toEqual({ address: 'p' });
    });

    it('does not lose a password typed before its user name', () => {
        const next = withCredentials(servers({ address: 'p' }), { user: '', pass: 'typed-first' });
        expect(readCredentials(next)).toEqual({ user: '', pass: 'typed-first' });
        expect(loginProblem(readCredentials(next))).toBe('pass-without-user');
    });

    it('starts a server entry when the outbound has none yet', () => {
        const next = withCredentials({ protocol: 'socks' } as any, { user: 'a', pass: 'b' }) as any;
        expect(next.settings.servers).toEqual([{ users: [{ user: 'a', pass: 'b' }] }]);
    });

    it('does not touch the outbound it was given', () => {
        const outbound = servers({ address: 'p', users: [{ user: 'a', pass: 'b' }] });
        const snapshot = JSON.stringify(outbound);
        withCredentials(outbound, { user: 'x', pass: 'y' });
        withCredentials(outbound, { user: '', pass: '' });
        expect(JSON.stringify(outbound)).toBe(snapshot);
    });
});

describe('a login that cannot be used yet', () => {
    it('is a password with no user name, and nothing else', () => {
        expect(loginProblem({ user: '', pass: 'x' })).toBe('pass-without-user');
        expect(loginProblem({ user: 'a', pass: '' })).toBeNull();
        expect(loginProblem({ user: 'a', pass: 'b' })).toBeNull();
        expect(loginProblem({ user: '', pass: '' })).toBeNull();
    });
});
