import { describe, expect, it } from 'bun:test';
import { validateOutbound } from './index';

const protocolErrors = (protocol: unknown) =>
    validateOutbound({ tag: 'x', protocol, settings: {} }).filter(error => error.field === 'protocol');

describe('which outbound protocols the form lets through', () => {
    it('takes every name the loader registers, in any case', () => {
        // infra/conf/xray.go outboundConfigLoader on v26.3.27 … v26.10.10,
        // matched lower-cased (infra/conf/loader.go:46).
        for (const name of ['direct', 'block', 'blackhole', 'freedom', 'loopback', 'dns', 'wireguard',
            'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria', 'masque', 'VLESS', 'Direct']) {
            expect(protocolErrors(name)).toEqual([]);
        }
    });

    it('refuses shadowsocks-2022, a name of this app and not of Xray, and says what it is', () => {
        const [error] = protocolErrors('shadowsocks-2022');
        expect(error?.message).toContain('shadowsocks');
        expect(error?.message).toContain('unknown config id');
    });

    it('refuses inbound-only and made-up names', () => {
        for (const name of ['tun', 'tunnel', 'dokodemo-door', 'hysteria2', 'nope', '', undefined]) {
            expect(protocolErrors(name)).toHaveLength(1);
        }
    });
});
