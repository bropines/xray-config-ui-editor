import { describe, expect, it } from 'bun:test';
import {
    effectiveNetwork,
    hysteriaUdpIdleProblem,
    isRemovedNetwork,
    kcpProblems,
    kcpReplacementMasks,
    kcpTtiRange,
    keyNotices,
    leftoverTransportSettings,
    networkOptions,
    networkProblem,
    networkSection,
    securityOptions,
    securityProblem,
} from './transport-networks';

/**
 * Two of the transports this chooser used to offer are removed features: the
 * core answers `PrintRemovedFeatureError` and the config does not load. An
 * option that cannot be picked without breaking the config has no business
 * sitting in the list beside the working ones.
 */

const values = (protocol?: string, current?: string, version?: '26.3' | '26.7' | '26.9') =>
    networkOptions(protocol, current, version).map(option => option.value);

describe('what the chooser offers', () => {
    it('does not offer a transport the core removed', () => {
        expect(values('vless')).not.toContain('http');
        expect(values('vless')).not.toContain('quic');
    });

    it('offers the ones the core still builds', () => {
        const offered = values('vless');
        for (const network of ['tcp', 'raw', 'xhttp', 'splithttp', 'ws', 'httpupgrade', 'grpc', 'kcp', 'hysteria']) {
            expect(offered).toContain(network);
        }
    });

    it('offers masque to the masque outbound and to nobody else', () => {
        // "the masque transport can only be used by the masque outbound"
        expect(values('masque')).toContain('masque');
        expect(values('vless')).not.toContain('masque');
        expect(values(undefined)).not.toContain('masque');
    });

    it('offers a hysteria proxy only the hysteria transport from 26.7', () => {
        // proxy/hysteria/client.go:37 — "not hysteria transport" from 26.7.
        expect(values('hysteria', undefined, '26.7')).toEqual(['hysteria']);
        expect(values('hysteria', undefined, '26.9')).toEqual(['hysteria']);
        // 26.3 does not check.
        expect(values('hysteria', undefined, '26.3')).toContain('tcp');
    });

    it('keeps a hysteria proxy\'s other transport on screen, disabled and explained', () => {
        const tcp = networkOptions('hysteria', 'tcp', '26.7').find(option => option.value === 'tcp')!;
        expect(tcp.disabled).toBe(true);
        expect(networkProblem('hysteria', 'tcp', '26.7')).toContain('hysteria');
        expect(networkProblem('hysteria', 'tcp', '26.3')).toBeUndefined();
    });

    it('shows an alias the config uses rather than an empty chooser', () => {
        const websocket = networkOptions('vless', 'websocket').find(option => option.value === 'websocket')!;
        expect(websocket).toBeDefined();
        expect(websocket.disabled).toBeFalsy();
    });
});

describe('a config that already holds a removed one', () => {
    it('shows it rather than leaving an empty chooser', () => {
        expect(values('vless', 'quic')).toContain('quic');
        expect(values('vless', 'http')).toContain('http');
    });

    it('says what it is and what replaced it, and does not offer it again', () => {
        const quic = networkOptions('vless', 'quic').find(option => option.value === 'quic')!;
        expect(quic.description).toContain('XHTTP');
        expect(quic.disabled).toBe(true);
    });

    it('does not add one the config does not have', () => {
        expect(values('vless', 'ws')).not.toContain('quic');
    });

    it('knows which names the core refuses', () => {
        for (const network of ['http', 'h2', 'h3', 'quic', 'QUIC']) {
            expect(isRemovedNetwork(network)).toBe(true);
        }
        for (const network of ['tcp', 'ws', 'xhttp', 'hysteria', 'masque', undefined]) {
            expect(isRemovedNetwork(network)).toBe(false);
        }
    });
});

describe('which transport runs', () => {
    it('reads method over network from 26.7, and ignores it on 26.3', () => {
        // v26.7.28:infra/conf/transport_internet.go:75 — method wins.
        const stream = { network: 'ws', method: 'xhttp' };
        expect(effectiveNetwork(stream, '26.7')).toBe('xhttp');
        expect(effectiveNetwork(stream, '26.9')).toBe('xhttp');
        expect(effectiveNetwork(stream, '26.3')).toBe('ws');
    });

    it('defaults to raw and lower-cases', () => {
        expect(effectiveNetwork({}, '26.7')).toBe('tcp');
        expect(effectiveNetwork({ network: 'WS' }, '26.7')).toBe('ws');
    });

    it('opens the same section for both names of a transport', () => {
        expect(networkSection('raw')).toBe('tcp');
        expect(networkSection('websocket')).toBe('ws');
        expect(networkSection('mkcp')).toBe('kcp');
        expect(networkSection('splithttp')).toBe('xhttp');
    });

    it('names settings objects of transports the config does not run', () => {
        expect(leftoverTransportSettings({ network: 'ws', wsSettings: {}, kcpSettings: { seed: 'x' } }, 'ws')).toEqual(['kcpSettings']);
        expect(leftoverTransportSettings({ network: 'raw', rawSettings: {}, tcpSettings: {} }, 'raw')).toEqual([]);
        // No supported line has quicSettings at all; it is dropped unread.
        expect(leftoverTransportSettings({ network: 'ws', quicSettings: {} }, 'ws')).toEqual([]);
    });
});

describe('security choices', () => {
    const offered = (protocol: string, network: string, current?: string) =>
        securityOptions(protocol, network, current).filter(option => !option.disabled).map(option => option.value);

    it('offers REALITY only over RAW, XHTTP and gRPC', () => {
        // "REALITY only supports RAW, XHTTP and gRPC for now."
        for (const network of ['tcp', 'raw', 'xhttp', 'splithttp', 'grpc']) {
            expect(offered('vless', network)).toContain('reality');
        }
        for (const network of ['ws', 'httpupgrade', 'kcp', 'hysteria']) {
            expect(offered('vless', network)).not.toContain('reality');
        }
    });

    it('still filters REALITY by protocol', () => {
        expect(offered('socks', 'tcp')).not.toContain('reality');
    });

    it('says why a REALITY over WebSocket will not load', () => {
        expect(securityProblem('vless', 'ws', 'reality', '26.7')).toContain('RAW, XHTTP or gRPC');
        expect(securityProblem('vless', 'tcp', 'reality', '26.7')).toBeUndefined();
    });

    it('offers the hysteria transport and proxy TLS alone', () => {
        expect(offered('vless', 'hysteria')).toEqual(['tls']);
        expect(offered('hysteria', 'hysteria')).toEqual(['tls']);
        expect(securityProblem('hysteria', 'hysteria', 'none')).toBeDefined();
        expect(securityProblem('hysteria', 'hysteria', 'tls')).toBeUndefined();
    });

    it('points legacy xtls at its replacement', () => {
        expect(securityProblem('vless', 'tcp', 'xtls')).toContain('xtls-rprx-vision');
    });
});

describe('mKCP per line', () => {
    it('reports seed and header as refused on 26.3 and 26.7, ignored on 26.9', () => {
        const kcp = { seed: 'x', header: { type: 'none' }, mtu: 1350 };
        const where = { scope: 'outbound' as const, settingsPath: 'streamSettings.kcpSettings' };
        const on = (version: '26.3' | '26.7' | '26.9') =>
            keyNotices(kcp, ['header', 'seed'], where, version).map(notice => `${notice.key}:${notice.status}`);
        expect(on('26.3')).toEqual(['header:rejected', 'seed:rejected']);
        expect(on('26.7')).toEqual(['header:rejected', 'seed:rejected']);
        expect(on('26.9')).toEqual(['header:absent', 'seed:absent']);
    });

    it('reports the keys each line dropped or does not have yet', () => {
        const kcp = { congestion: true, writeBufferSize: 2, maxSendingWindow: 4096, cwndMultiplier: 2 };
        const where = { scope: 'inbound' as const, settingsPath: 'streamSettings.kcpSettings' };
        const keys = ['congestion', 'readBufferSize', 'writeBufferSize', 'maxSendingWindow', 'cwndMultiplier'];
        expect(keyNotices(kcp, keys, where, '26.3').map(notice => notice.key)).toEqual(['maxSendingWindow', 'cwndMultiplier']);
        expect(keyNotices(kcp, keys, where, '26.7').map(notice => notice.key)).toEqual(['congestion', 'writeBufferSize']);
        // writeBufferSize names what replaced it.
        expect(keyNotices(kcp, keys, where, '26.7').find(notice => notice.key === 'writeBufferSize')!.replacement)
            .toBe('streamSettings.kcpSettings.maxSendingWindow');
    });

    it('holds TTI to each line\'s range', () => {
        expect(kcpTtiRange('26.3').max).toBe(5000);
        expect(kcpTtiRange('26.7').max).toBe(1000);
        expect(kcpProblems({ tti: 2000 }, '26.3').tti).toBeUndefined();
        expect(kcpProblems({ tti: 2000 }, '26.7').tti).toBeDefined();
        expect(kcpProblems({ tti: 5 }, '26.3').tti).toBeDefined();
    });

    it('checks mtu, cwndMultiplier and the window from 26.7 only', () => {
        expect(kcpProblems({ mtu: 10 }, '26.3').mtu).toBeUndefined();
        expect(kcpProblems({ mtu: 10 }, '26.7').mtu).toBeDefined();
        expect(kcpProblems({ cwndMultiplier: 0 }, '26.7').cwndMultiplier).toBeDefined();
        // MaxSendingWindow / Mtu must not be 0: at least one MTU.
        expect(kcpProblems({ maxSendingWindow: 1000 }, '26.7').maxSendingWindow).toBeDefined();
        expect(kcpProblems({ maxSendingWindow: 1000, mtu: 1000 }, '26.7').maxSendingWindow).toBeUndefined();
    });

    it('points at the masks that replaced header and seed on each line', () => {
        expect(kcpReplacementMasks('26.3')).toContain('mkcp-aes128gcm');
        expect(kcpReplacementMasks('26.3')).toContain('header-wechat');
        expect(kcpReplacementMasks('26.3')).not.toContain('header-custom');
        expect(kcpReplacementMasks('26.7')).toEqual(['mkcp-legacy']);
    });
});

describe('hysteria per line', () => {
    it('takes 0 or 2-600 seconds of UDP idle time', () => {
        expect(hysteriaUdpIdleProblem(0)).toBeUndefined();
        expect(hysteriaUdpIdleProblem(2)).toBeUndefined();
        expect(hysteriaUdpIdleProblem(600)).toBeUndefined();
        expect(hysteriaUdpIdleProblem(1)).toBeDefined();
        expect(hysteriaUdpIdleProblem(601)).toBeDefined();
    });

    it('reports congestion, bandwidth and hopping as having no effect on any line', () => {
        // Not "deprecated, still works", which this once said for 26.3 and
        // 26.7. There the core logs that they "move to finalmask/quicParams"
        // and then never copies them into the config it builds
        // (v26.7.28:infra/conf/transport_method.go:779-797) — so a value set
        // here changes nothing, exactly as on 26.9 where the keys are gone.
        const hysteria = { version: 2, congestion: 'bbr', up: '100 mbps', udphop: { ports: '20000-30000' } };
        const where = { scope: 'outbound' as const, settingsPath: 'streamSettings.hysteriaSettings' };
        const keys = ['congestion', 'up', 'down', 'udphop'];
        expect(keyNotices(hysteria, keys, where, '26.3').map(notice => notice.status)).toEqual(['absent', 'absent', 'absent']);
        expect(keyNotices(hysteria, keys, where, '26.7').map(notice => notice.status)).toEqual(['absent', 'absent', 'absent']);
        expect(keyNotices(hysteria, keys, where, '26.9').map(notice => notice.status)).toEqual(['absent', 'absent', 'absent']);
    });
});
