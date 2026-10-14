import { describe, expect, it } from 'bun:test';
import { requiresTransportSecurity, ruleDiagnostics } from './rules';
import { getCriticalRuleErrors } from '../../validators';

describe('what the core calls a private address', () => {
    it('exempts the private and special IPv4 ranges', () => {
        for (const ip of ['10.1.2.3', '192.168.1.1', '172.20.0.1', '127.0.0.1', '100.64.1.1', '169.254.1.1', '198.18.0.1']) {
            expect(requiresTransportSecurity(ip)).toBe(false);
        }
    });

    it('demands security for a public IPv4', () => {
        for (const ip of ['1.1.1.1', '81.94.159.32', '172.32.0.1', '100.128.0.1']) {
            expect(requiresTransportSecurity(ip)).toBe(true);
        }
    });

    it('exempts private IPv6 and demands it for public', () => {
        expect(requiresTransportSecurity('::1')).toBe(false);
        expect(requiresTransportSecurity('fd00::1')).toBe(false);
        expect(requiresTransportSecurity('fe80::1')).toBe(false);
        expect(requiresTransportSecurity('2606:4700::1111')).toBe(true);
    });

    it('exempts dotless names and the private suffixes', () => {
        for (const name of ['router', 'nas', 'box.lan', 'printer.local', 'x.home.arpa', 'svc.internal', 'localhost', 'a.test']) {
            expect(requiresTransportSecurity(name)).toBe(false);
        }
    });

    it('demands security for a public domain', () => {
        expect(requiresTransportSecurity('node.example.com')).toBe(true);
        expect(requiresTransportSecurity('olsg.vpn.ru')).toBe(true);
    });

    it('has nothing to say about a missing address', () => {
        expect(requiresTransportSecurity(undefined)).toBe(false);
        expect(requiresTransportSecurity('')).toBe(false);
    });
});

describe('plaintext VLESS and Trojan', () => {
    const flatVless = (address: string, extra: Record<string, unknown> = {}) => ({
        outbounds: [{ tag: 'v', protocol: 'vless', settings: { address, port: 443, id: 'x', ...extra } }],
    });

    it('is refused from 26.7 to a public address in the flat form', () => {
        const found = ruleDiagnostics(flatVless('1.2.3.4'), '26.7');
        expect(found).toHaveLength(1);
        expect(found[0]!.severity).toBe('critical');
        expect(found[0]!.field).toBe('streamSettings.security');
    });

    it('is fine on 26.3, which has no such check', () => {
        expect(ruleDiagnostics(flatVless('1.2.3.4'), '26.3')).toEqual([]);
    });

    it('is fine to a private address', () => {
        expect(ruleDiagnostics(flatVless('192.168.1.10'), '26.9')).toEqual([]);
    });

    it('is fine with TLS or REALITY', () => {
        const config: any = flatVless('1.2.3.4');
        config.outbounds[0].streamSettings = { security: 'reality' };
        expect(ruleDiagnostics(config, '26.9')).toEqual([]);
    });

    it('is fine with VLESS encryption set', () => {
        expect(ruleDiagnostics(flatVless('1.2.3.4', { encryption: 'mlkem768x25519plus.native.1rtt.key' }), '26.9')).toEqual([]);
    });

    it('checks the vnext form on 26.9, which copies it in for the check, but not on 26.7', () => {
        const config = { outbounds: [{ tag: 'v', protocol: 'vless', settings: { vnext: [{ address: '1.2.3.4', port: 443, users: [{ id: 'x' }] }] } }] };
        expect(ruleDiagnostics(config, '26.7')).toEqual([]);
        expect(ruleDiagnostics(config, '26.9')).toHaveLength(1);
    });

    it('reads the encryption of the vnext user on 26.9', () => {
        const config = { outbounds: [{ tag: 'v', protocol: 'vless', settings: { vnext: [{ address: '1.2.3.4', port: 443, users: [{ id: 'x', encryption: 'mlkem768x25519plus.native.1rtt.key' }] }] } }] };
        expect(ruleDiagnostics(config, '26.9')).toEqual([]);
    });

    it('checks Trojan servers[] on 26.9 but not on 26.7', () => {
        const config = { outbounds: [{ tag: 't', protocol: 'trojan', settings: { servers: [{ address: '1.2.3.4', port: 443, password: 'p' }] } }] };
        expect(ruleDiagnostics(config, '26.7')).toEqual([]);
        expect(ruleDiagnostics(config, '26.9')).toHaveLength(1);
    });
});

describe('a blackhole response without a type', () => {
    const config = { outbounds: [{ tag: 'b', protocol: 'blackhole', settings: { response: {} } }] };

    it('is refused before 26.9', () => {
        expect(ruleDiagnostics(config, '26.7')[0]?.severity).toBe('critical');
        expect(ruleDiagnostics(config, '26.3')[0]?.severity).toBe('critical');
    });

    it('is fine on 26.9', () => {
        expect(ruleDiagnostics(config, '26.9')).toEqual([]);
    });

    it('is fine with a type', () => {
        const typed = { outbounds: [{ tag: 'b', protocol: 'blackhole', settings: { response: { type: 'http' } } }] };
        expect(ruleDiagnostics(typed, '26.7')).toEqual([]);
    });
});

describe('duplicate routing tags', () => {
    const config = {
        routing: {
            rules: [
                { ruleTag: 'ads', domain: ['a'], outboundTag: 'x' },
                { ruleTag: 'ads', domain: ['b'], outboundTag: 'x' },
            ],
            balancers: [{ tag: 'pool', selector: ['a'] }, { tag: 'pool', selector: ['b'] }],
        },
    };

    it('stop 26.9 from starting', () => {
        const found = ruleDiagnostics(config, '26.9');
        expect(found.map(d => d.field).sort()).toEqual(['ruleTag', 'tag']);
        expect(found.every(d => d.severity === 'critical')).toBe(true);
    });

    it('are tolerated before 26.9', () => {
        expect(ruleDiagnostics(config, '26.7')).toEqual([]);
    });
});

describe('what counts as a rule condition', () => {
    it('accepts a rule whose only condition is one the old list missed', () => {
        for (const rule of [
            { process: ['curl'], outboundTag: 'x' },
            { localPort: '1080', outboundTag: 'x' },
            { vlessRoute: '1', outboundTag: 'x' },
            { localIP: ['10.0.0.1'], outboundTag: 'x' },
        ]) {
            expect(getCriticalRuleErrors(rule).some(e => e.field === 'matchers')).toBe(false);
        }
    });

    it('does not count an empty list as a condition, as the core does not', () => {
        expect(getCriticalRuleErrors({ domain: [], outboundTag: 'x' }).some(e => e.field === 'matchers')).toBe(true);
    });
});

describe('hysteria', () => {
    it('refuses an outbound without version 2 on every line', () => {
        const config = { outbounds: [{ tag: 'h', protocol: 'hysteria', settings: { address: 'h.example.com', port: 443 } }] };
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            expect(ruleDiagnostics(config, version).some(d => d.field === 'settings.version')).toBe(true);
        }
    });

    it('refuses an outbound whose address sits in servers[], where the core never reads it', () => {
        const config = { outbounds: [{ tag: 'h', protocol: 'hysteria', settings: { version: 2, servers: [{ address: 'h.example.com', port: 443 }] } }] };
        const found = ruleDiagnostics(config, '26.7').find(d => d.field === 'settings.address')!;
        expect(found.severity).toBe('critical');
        expect(found.suggestion).toBeDefined();
    });

    it('accepts the flat form with version 2', () => {
        const config = { outbounds: [{ tag: 'h', protocol: 'hysteria', settings: { version: 2, address: 'h.example.com', port: 443 } }] };
        expect(ruleDiagnostics(config, '26.9')).toEqual([]);
    });

    it('checks the inbound version only from 26.7', () => {
        const config = { inbounds: [{ tag: 'in', protocol: 'hysteria', settings: { clients: [] } }] };
        expect(ruleDiagnostics(config, '26.3')).toEqual([]);
        expect(ruleDiagnostics(config, '26.7').some(d => d.field === 'settings.version')).toBe(true);
    });
});

describe('hysteria and TLS', () => {
    const LINES = ['26.3', '26.7', '26.9', '26.10'] as const;
    const securityFindings = (config: unknown, version: (typeof LINES)[number]) =>
        ruleDiagnostics(config, version).filter(d => d.field === 'streamSettings.security').map(d => d.severity);
    const server = (protocol: string, streamSettings: unknown) => ({ inbounds: [{ tag: 'in', protocol, port: 443, streamSettings }] });

    it('refuses the hysteria transport without TLS on every line, whatever proxy rides it', () => {
        // "tls config is nil": v26.3.27 hub.go:317, v26.7.28 :200, v26.9.9 :202, v26.10.10 :202.
        for (const version of LINES) {
            expect(securityFindings(server('hysteria', { network: 'hysteria', security: 'none' }), version)).toEqual(['critical']);
            expect(securityFindings(server('vless', { network: 'hysteria', security: 'none' }), version)).toEqual(['critical']);
            expect(securityFindings(server('vless', { network: 'hysteria' }), version)).toEqual(['critical']);
            expect(securityFindings(server('hysteria', { network: 'hysteria', security: 'tls' }), version)).toEqual([]);
        }
    });

    it('leaves a hysteria proxy on another transport to that transport on 26.3', () => {
        // v26.3.27:proxy/hysteria/server.go:30-51 does not look at the transport.
        for (const security of ['none', 'tls', '']) {
            expect(securityFindings(server('hysteria', { network: 'tcp', security }), '26.3')).toEqual([]);
        }
        expect(securityFindings(server('hysteria', { network: 'ws', security: 'none' }), '26.3')).toEqual([]);
    });

    it('holds a hysteria proxy to TLS from 26.7, where it only starts on the hysteria transport', () => {
        // v26.7.28:proxy/hysteria/server.go:36 — the same lines at v26.9.9 and v26.10.10.
        for (const version of ['26.7', '26.9', '26.10'] as const) {
            expect(securityFindings(server('hysteria', { network: 'tcp', security: 'none' }), version)).toEqual(['critical']);
        }
    });

    it('says nothing of an outbound: its dialer fails on the first dial, and the config loads', () => {
        const client = { outbounds: [{ tag: 'o', protocol: 'vless', streamSettings: { network: 'hysteria', security: 'none' } }] };
        for (const version of LINES) expect(securityFindings(client, version)).toEqual([]);
    });
});
