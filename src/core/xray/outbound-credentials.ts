/**
 * Where a SOCKS or HTTP outbound keeps its server and its login. A Shadowsocks
 * outbound has the same two shapes for its server (shadowsocks-outbound.ts
 * reads them through `serverShape` and `serverPath` below), without the login.
 *
 * The client config has two shapes, the same on every supported tag
 * (v26.7.28:infra/conf/socks.go:77-85 and :87-136, infra/conf/http.go — the
 * 26.3 and 26.9 copies differ only in whitespace):
 *
 *   flat     settings.address, .port, .user, .pass
 *   servers  settings.servers[0].address, .port, .users[0].user, .pass
 *
 * `Build()` takes the flat one whenever `address` is present and overwrites
 * `servers` with it (socks.go:89-99), so a config holding both is the flat
 * one as far as the core is concerned — and an editor that goes on writing
 * `servers[0]` there is editing something that will never be read. That is
 * what `serverShape` decides, by the same test the core uses.
 *
 * The form had no login fields at all: it drew a "UUID / ID" box for these
 * protocols and wired it to nothing, so an authenticated SOCKS or HTTP proxy
 * could only be set up in the raw editor.
 */

export type ServerShape = 'flat' | 'servers';

export interface Credentials {
    user: string;
    pass: string;
}

type Json = Record<string, any>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Protocols whose client config has these two shapes. */
export const hasLogin = (protocol: unknown): boolean => protocol === 'socks' || protocol === 'http';

/**
 * The shape the core will read: flat as soon as `settings.address` is there.
 * `address: null` is not there — Go decodes it into a nil `*Address`, which is
 * the `v.Address != nil` test failing (socks.go:78 and :89, http.go:59 and
 * :71 on v26.7.28; infra/conf/shadowsocks.go:202 on v26.10.10 tests the same).
 */
export const serverShape = (outbound: unknown): ServerShape =>
    isObject(outbound) && isObject(outbound.settings)
        && outbound.settings.address !== undefined && outbound.settings.address !== null
        ? 'flat'
        : 'servers';

/** The path to the object holding `address` and `port`, for the shape in use. */
export const serverPath = (outbound: unknown): (string | number)[] =>
    serverShape(outbound) === 'flat' ? ['settings'] : ['settings', 'servers', 0];

export const readCredentials = (outbound: unknown): Credentials => {
    if (!isObject(outbound) || !isObject(outbound.settings)) return { user: '', pass: '' };
    const settings = outbound.settings;
    if (serverShape(outbound) === 'flat') return { user: text(settings.user), pass: text(settings.pass) };
    const server = Array.isArray(settings.servers) ? settings.servers[0] : undefined;
    const account = isObject(server) && Array.isArray(server.users) ? server.users[0] : undefined;
    return isObject(account) ? { user: text(account.user), pass: text(account.pass) } : { user: '', pass: '' };
};

/**
 * The outbound with this login, written where its shape keeps one.
 *
 * With both boxes empty there is no login, and the keys are taken out rather
 * than left as empty strings: a `users` entry is an account whatever is in
 * it, so an empty one makes the client offer username/password
 * authentication with nothing to offer. A password typed before its user
 * name is kept — losing keystrokes to a rule is worse than a half-filled
 * form — and `loginProblem` is what says the pair is not usable yet.
 * Anything else on the account (`level`, `email`) is kept. Pure.
 */
export const withCredentials = <T extends Json>(outbound: T, { user, pass }: Credentials): T => {
    const settings: Json = isObject(outbound.settings) ? { ...outbound.settings } : {};

    const none = user === '' && pass === '';

    if (serverShape(outbound) === 'flat') {
        if (none) {
            delete settings.user;
            delete settings.pass;
        } else {
            settings.user = user;
            settings.pass = pass;
        }
        return { ...outbound, settings };
    }

    const servers = Array.isArray(settings.servers) ? [...settings.servers] : [];
    const server: Json = isObject(servers[0]) ? { ...servers[0] } : {};
    if (none) {
        delete server.users;
    } else {
        const existing = Array.isArray(server.users) && isObject(server.users[0]) ? server.users[0] : {};
        // "users" takes one member at most (socks.go:104); the rest of the
        // list, if a config had one, is what the core would have refused.
        server.users = [{ ...existing, user, pass }];
    }
    servers[0] = server;
    return { ...outbound, settings: { ...settings, servers } };
};

/**
 * A login the proxy cannot be given as it stands: a password with no name.
 * The flat form then sends no login at all (socks.go:96 checks the name) and
 * the servers form sends an empty one — neither is what was typed.
 */
export const loginProblem = ({ user, pass }: Credentials): 'pass-without-user' | null =>
    user === '' && pass !== '' ? 'pass-without-user' : null;
