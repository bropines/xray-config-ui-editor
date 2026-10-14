import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useConfigStore } from '../../../store/configStore';
import { t } from '../../../i18n';
import { wireguardPublicKey } from '../../../core/generators/crypto';
import { InboundCoreNotes } from './InboundCoreNotes';

const onLine = (version: '26.3' | '26.7' | '26.9') => useConfigStore.setState({ coreVersion: version } as any);

afterEach(() => {
    cleanup();
    onLine('26.7');
});

describe('InboundCoreNotes', () => {
    it('draws nothing for an inbound every line reads', () => {
        onLine('26.3');
        const { container } = render(
            <InboundCoreNotes inbound={{ protocol: 'vless', port: 443, settings: { clients: [], decryption: 'none' } }} onChange={() => {}} />,
        );
        expect(container.textContent).toBe('');
    });

    it('removes allocate, which no line reads, only when asked', () => {
        const calls: [unknown, unknown][] = [];
        render(
            <InboundCoreNotes
                inbound={{ protocol: 'vless', port: 443, settings: { clients: [], decryption: 'none' }, allocate: { strategy: 'always' } }}
                onChange={(path, value) => calls.push([path, value])}
            />,
        );
        expect(screen.getByText(t("{what} is not read by any supported Xray version — it does nothing.", { what: 'allocate' }))).toBeTruthy();
        expect(calls).toEqual([]);
        fireEvent.click(screen.getByText(t("Remove")));
        expect(calls).toEqual([['allocate', undefined]]);
    });

    it('renames a 26.7-only users list on 26.3 instead of deleting it', () => {
        onLine('26.3');
        const calls: [unknown, any][] = [];
        render(
            <InboundCoreNotes
                inbound={{ protocol: 'trojan', port: 443, settings: { users: [{ password: 'x' }] } }}
                onChange={(path, value) => calls.push([path, value])}
            />,
        );
        fireEvent.click(screen.getByText(t("Rename to {key}", { key: 'clients' })));
        expect(calls).toEqual([['settings', { clients: [{ password: 'x' }] }]]);
    });

    it('says shadowsocks-2022 is no protocol, and renames it without touching the method', () => {
        const calls: [unknown, any][] = [];
        const { container } = render(
            <InboundCoreNotes
                inbound={{ protocol: 'shadowsocks-2022', port: 8388, settings: { method: '2022-blake3-aes-128-gcm', password: 'AAAAAAAAAAAAAAAAAAAAAA==' } }}
                onChange={(path, value) => calls.push([path, value])}
            />,
        );
        expect(container.textContent).toContain('"shadowsocks-2022" is not a protocol Xray knows');
        expect(calls).toEqual([]);
        fireEvent.click(screen.getByText(t("Use shadowsocks")));
        expect(calls).toEqual([['protocol', 'shadowsocks']]);
    });

    it('says a WireGuard inbound with no secret key will not load, and offers to make one', () => {
        const calls: [unknown, any][] = [];
        const { container } = render(
            <InboundCoreNotes
                inbound={{ protocol: 'wireguard', port: 51820, settings: { secretKey: '', peers: [] } }}
                onChange={(path, value) => calls.push([path, value])}
            />,
        );
        expect(screen.getByText(t("{what} is empty. Every supported Xray refuses a WireGuard inbound without its secret key — the config will not load.", { what: 'settings.secretKey' }))).toBeTruthy();
        // Refused, so the box is the red one rather than the amber one.
        expect(container.firstElementChild!.className).toContain('rose');
        expect(calls).toEqual([]);

        fireEvent.click(screen.getByText(t("Generate a key")));
        expect(calls).toHaveLength(1);
        expect(calls[0]![0]).toEqual(['settings', 'secretKey']);
        expect(wireguardPublicKey(calls[0]![1])).not.toBeNull();
    });

    it('does not offer to replace a key that is there and wrong', () => {
        render(
            <InboundCoreNotes
                inbound={{ protocol: 'wireguard', port: 51820, settings: { secretKey: 'not a key!', peers: [] } }}
                onChange={() => {}}
            />,
        );
        expect(screen.getByText(t("{what} is not a WireGuard key: Xray cannot decode it, and the config will not load.", { what: 'settings.secretKey' }))).toBeTruthy();
        expect(screen.queryByText(t("Generate a key"))).toBeNull();
    });

    it('lets the user pick which of two user lists to keep', () => {
        const calls: [unknown, any][] = [];
        const inbound = { protocol: 'vless', port: 443, settings: { clients: [], users: [{ id: 'a' }], decryption: 'none' } };
        render(<InboundCoreNotes inbound={inbound} onChange={(path, value) => calls.push([path, value])} />);
        fireEvent.click(screen.getByText(t("Use {alias} instead", { alias: 'users' })));
        fireEvent.click(screen.getByText(t("Remove {alias}", { alias: 'users' })));
        expect(calls).toEqual([
            ['settings', { clients: [{ id: 'a' }], decryption: 'none' }],
            ['settings', { clients: [], decryption: 'none' }],
        ]);
    });
});
