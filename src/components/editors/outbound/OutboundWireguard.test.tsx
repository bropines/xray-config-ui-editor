import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { OutboundWireguard } from './OutboundWireguard';
import { useOutboundEditor } from '../../../hooks/useOutboundEditor';
import { useConfigStore } from '../../../store/configStore';
import { createDefaultOutbound } from '../../../core/generators/endpoint-factory';
import { generateWireguardKeyPair } from '../../../core/generators/crypto';
import { addressIssues } from '../../../core/xray/wireguard-config';
import { WARP_ENDPOINT } from '../../../core/presets';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * The WireGuard outbound card, drawn over the editor's real state. What it
 * is held to here is what the diagnostics hold the same outbound to
 * (core/xray/wireguard-outbound.ts), and what it suggests has to be something
 * every supported line takes.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

const SECRET = generateWireguardKeyPair().secretKey;
const SERVER = generateWireguardKeyPair().publicKey;

const mount = (data: any) => {
    const seen: any[] = [];
    let replace: (next: any) => void = () => {};
    const Harness = () => {
        const { local, setLocal, updateField } = useOutboundEditor(data, () => {}, null);
        replace = setLocal;
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return <OutboundWireguard outbound={local} onChange={updateField} errors={{}} />;
    };
    const view = render(<Harness />);
    return {
        ...view,
        /** The outbound as it would be saved: `undefined` keys gone, as in the JSON. */
        current: () => JSON.parse(JSON.stringify(seen[seen.length - 1])),
        /** Something other than the box rewrites the outbound: the raw editor, an undo, a registration. */
        replace: (next: any) => act(() => replace(next)),
    };
};

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const valueOf = (input: HTMLElement) => (input as HTMLInputElement).value;
const box = (label: string) => screen.getByLabelText(label);
const problemsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-problem]')).map(node => node.getAttribute('data-problem'));

const complete = (patch: Record<string, unknown> = {}) => ({
    tag: 'wg', protocol: 'wireguard',
    settings: {
        secretKey: SECRET,
        address: ['10.0.0.2/32'],
        peers: [{ publicKey: SERVER, endpoint: 'vpn.example.com:51820' }],
        ...patch,
    },
});

describe('what the core refuses, said beside the field', () => {
    it('is the secret key, the peer key and the endpoint on what the factory builds', () => {
        const { container } = mount(createDefaultOutbound('wireguard'));
        // In the order the card draws them: the endpoint sits before the public key.
        expect(problemsIn(container)).toEqual(['secretKey.empty', 'endpoint.empty', 'publicKey.empty']);
        expect(box(t("Secret Key")).getAttribute('aria-invalid')).toBe('true');
    });

    it('clears as the fields are filled in', () => {
        const { container, current } = mount(createDefaultOutbound('wireguard'));
        type(box(t("Secret Key")), SECRET);
        type(box(t("Public Key")), SERVER);
        type(box(t("Endpoint")), 'vpn.example.com:51820');
        expect(problemsIn(container)).toEqual([]);
        expect(current().settings.peers[0]).toEqual({ publicKey: SERVER, endpoint: 'vpn.example.com:51820' });
    });

    it('judges a key as the core would while it is typed', () => {
        const { container } = mount(complete());
        type(box(t("Secret Key")), 'not a key!');
        expect(problemsIn(container)).toEqual(['secretKey.invalid']);
        type(box(t("Secret Key")), 'AAAA');
        expect(problemsIn(container)).toEqual(['secretKey.length']);
    });

    it('reports an endpoint that is not host:port', () => {
        const { container } = mount(complete());
        type(box(t("Endpoint")), 'vpn.example.com');
        expect(problemsIn(container)).toEqual(['endpoint.form']);
    });

    it('says the outbound has no peer, above the empty list', () => {
        const { container } = mount(complete({ peers: [] }));
        expect(problemsIn(container)).toEqual(['peers.none']);
    });

    it('points a keyless WARP profile at the button that registers it', () => {
        const { container } = mount({
            tag: 'warp', protocol: 'wireguard',
            settings: { secretKey: '', address: ['172.16.0.2/32'], peers: [{ endpoint: WARP_ENDPOINT, publicKey: '' }] },
        });
        expect(problemsIn(container)).toEqual(['secretKey.empty', 'publicKey.empty']);
        expect(screen.getAllByText(/Press Generate WARP/)).toHaveLength(2);
        expect(screen.getByRole('button', { name: t("Generate WARP") })).toBeDefined();
    });
});

describe('the local address', () => {
    it('is suggested as something every line takes', () => {
        mount(complete({ address: undefined }));
        const suggestion = (box(t("Local Address (CIDR)")) as HTMLInputElement).placeholder;
        const entries = suggestion.split(',').map(entry => entry.trim());
        expect(entries.length).toBeGreaterThan(0);
        for (const line of ['26.3', '26.7', '26.9'] as const) expect(addressIssues(entries, line)).toEqual([]);
    });

    it('is reported when a line refuses it: a /24 on 26.3, and not on 26.7', () => {
        onLine('26.3');
        const { container } = mount(complete({ address: ['10.0.0.2/24'] }));
        expect(problemsIn(container)).toEqual(['address']);
        cleanup();
        onLine('26.7');
        const other = mount(complete({ address: ['10.0.0.2/24'] }));
        expect(problemsIn(other.container)).toEqual([]);
    });

    it('keeps a comma that has just been typed, and never writes an empty entry', () => {
        const { current } = mount(complete({ address: undefined }));
        const field = box(t("Local Address (CIDR)"));
        type(field, '10.0.0.2/32,');
        expect(valueOf(field)).toBe('10.0.0.2/32,');
        expect(current().settings.address).toEqual(['10.0.0.2/32']);
        type(field, '10.0.0.2/32, ');
        expect(valueOf(field)).toBe('10.0.0.2/32, ');
        expect(current().settings.address).toEqual(['10.0.0.2/32']);
        type(field, '10.0.0.2/32, fd00::2/128');
        expect(current().settings.address).toEqual(['10.0.0.2/32', 'fd00::2/128']);
    });

    it('is left out when emptied, so the core\'s own default applies', () => {
        const { current } = mount(complete());
        type(box(t("Local Address (CIDR)")), '');
        expect(current().settings.address).toBeUndefined();
    });

    it('shows what the config holds', () => {
        mount(complete({ address: ['172.16.0.2/32', '2606:4700::2/128'] }));
        expect(valueOf(box(t("Local Address (CIDR)")))).toBe('172.16.0.2/32, 2606:4700::2/128');
    });

    it('is refilled when the list changes underneath the box', () => {
        const { current, replace } = mount(complete({ address: undefined }));
        const field = box(t("Local Address (CIDR)"));
        type(field, '10.0.0.2/32, ');
        replace(complete({ address: ['172.16.0.2/32', '2606:4700::2/128'] }));
        expect(valueOf(field)).toBe('172.16.0.2/32, 2606:4700::2/128');
        expect(current().settings.address).toEqual(['172.16.0.2/32', '2606:4700::2/128']);
    });
});

describe('remote DNS', () => {
    it('can be typed as a list: the comma stays until the next address follows it', () => {
        onLine('26.9');
        const { container, current } = mount(complete());
        const field = box(t("Remote DNS"));
        type(field, '1.1.1.1,');
        expect(valueOf(field)).toBe('1.1.1.1,');
        type(field, '1.1.1.1, ');
        expect(valueOf(field)).toBe('1.1.1.1, ');
        expect(current().settings.remoteDNS).toEqual(['1.1.1.1']);
        type(field, '1.1.1.1, 1.0.0.1');
        expect(valueOf(field)).toBe('1.1.1.1, 1.0.0.1');
        expect(current().settings.remoteDNS).toEqual(['1.1.1.1', '1.0.0.1']);
        expect(problemsIn(container)).toEqual([]);
    });

    it('is reported when it is not an address, where the core panics on it', () => {
        onLine('26.9');
        const { container } = mount(complete({ remoteDNS: ['dns.example.com'] }));
        expect(problemsIn(container)).toEqual(['remoteDNS']);
    });

    it('is left out when emptied', () => {
        onLine('26.9');
        const { current } = mount(complete({ remoteDNS: ['1.1.1.1'] }));
        type(box(t("Remote DNS")), '');
        expect(current().settings.remoteDNS).toBeUndefined();
    });

    it('is still drawn on a line that drops it, when the config holds it', () => {
        onLine('26.7');
        mount(complete({ remoteDNS: ['1.1.1.1'] }));
        expect(valueOf(box(t("Remote DNS")))).toBe('1.1.1.1');
    });
});

describe('reserved', () => {
    it('can be typed with its commas', () => {
        const { container, current } = mount(complete());
        const field = box(t("Reserved (CSV)"));
        type(field, '0,');
        expect(valueOf(field)).toBe('0,');
        type(field, '0, 0, 12');
        expect(valueOf(field)).toBe('0, 0, 12');
        expect(current().settings.reserved).toEqual([0, 0, 12]);
        expect(problemsIn(container)).toEqual([]);
    });

    it('takes digits and commas only', () => {
        const { current } = mount(complete());
        type(box(t("Reserved (CSV)")), '1a, 2b, 3c');
        expect(current().settings.reserved).toEqual([1, 2, 3]);
    });

    it('is reported, not cut, when it is not three bytes', () => {
        const { container, current } = mount(complete());
        type(box(t("Reserved (CSV)")), '1, 2');
        expect(problemsIn(container)).toEqual(['reserved']);
        type(box(t("Reserved (CSV)")), '1, 2, 3, 4');
        expect(current().settings.reserved).toEqual([1, 2, 3, 4]);
        expect(problemsIn(container)).toEqual(['reserved']);
        type(box(t("Reserved (CSV)")), '1, 2, 300');
        expect(problemsIn(container)).toEqual(['reserved']);
    });
});

describe('allowed IPs', () => {
    it('can be typed with its commas, and never holds an empty entry', () => {
        const { container, current } = mount(complete());
        const field = box(t("Allowed IPs"));
        type(field, '10.0.0.0/8,');
        expect(valueOf(field)).toBe('10.0.0.0/8,');
        expect(current().settings.peers[0].allowedIPs).toEqual(['10.0.0.0/8']);
        type(field, '10.0.0.0/8, ::/0');
        expect(current().settings.peers[0].allowedIPs).toEqual(['10.0.0.0/8', '::/0']);
        expect(problemsIn(container)).toEqual([]);
    });

    it('is left out when emptied: everything, which is what the placeholder says', () => {
        const { current } = mount(complete({ peers: [{ publicKey: SERVER, endpoint: 'vpn.example.com:51820', allowedIPs: ['10.0.0.0/8'] }] }));
        type(box(t("Allowed IPs")), '');
        expect(current().settings.peers[0].allowedIPs).toBeUndefined();
    });

    it('is reported when an entry is a bare address', () => {
        const { container } = mount(complete());
        type(box(t("Allowed IPs")), '10.0.0.2');
        expect(problemsIn(container)).toEqual(['allowedIPs']);
    });

    it('does not crash on a list that is not one', () => {
        expect(() => mount(complete({ address: '10.0.0.2/32', remoteDNS: 'x', reserved: 'AAAA', peers: [{ publicKey: SERVER, endpoint: 'a:1', allowedIPs: 'x' }] }))).not.toThrow();
    });
});
