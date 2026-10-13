import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useEffect } from 'react';
import { InboundWireguard } from './InboundWireguard';
import { InboundCoreNotes } from './InboundCoreNotes';
import { useInboundEditor } from '../../../hooks/useInboundEditor';
import { useConfigStore } from '../../../store/configStore';
import { createDefaultInbound } from '../../../core/generators/endpoint-factory';
import { generateWireguardKeyPair, parseWireguardKey, wireguardPublicKey } from '../../../core/generators/crypto';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * `wireguard` was in the inbound protocol list with no card behind it: the
 * factory wrote an empty secret key and no field anywhere could fill it in,
 * so every WireGuard inbound made here was one the core refuses. These draw
 * the card over the editor's real state and read back what it wrote.
 */

// A block body: the persisting store's setState hands back a promise that
// would otherwise turn this into an unawaited async act.
const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

/**
 * The card and the notes above it, over `useInboundEditor` — the hook the
 * modal uses, so a path the card writes lands where the editor would put it.
 */
const mount = (data: any) => {
    const seen: any[] = [];
    const Harness = () => {
        const { local, updateField } = useInboundEditor(data, () => {});
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return (
            <>
                <InboundCoreNotes inbound={local} onChange={updateField} />
                <InboundWireguard inbound={local} onChange={updateField} />
            </>
        );
    };
    const view = render(<Harness />);
    const card = (name: 'interface' | 'peers') => view.container.querySelector(`[data-wireguard="${name}"]`) as HTMLElement;
    return {
        ...view,
        /** The inbound as it would be saved — `undefined` keys gone, as in the JSON. */
        current: () => JSON.parse(JSON.stringify(seen[seen.length - 1])),
        iface: () => within(card('interface')),
        peers: () => within(card('peers')),
        peer: (index: number) => within(view.container.querySelector(`[data-peer="${index}"]`) as HTMLElement),
        card,
    };
};

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const valueOf = (input: HTMLElement) => (input as HTMLInputElement).value;
const problemsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-problem]')).map(node => node.getAttribute('data-problem'));
/** Fields shown only because the config holds them, each saying what this line does with it. */
const statusesIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-status]')).map(node => node.getAttribute('data-status'));

const EMPTY_KEY = () => t("{what} is empty. Every supported Xray refuses a WireGuard inbound without its secret key — the config will not load.", { what: 'settings.secretKey' });
const KEY = generateWireguardKeyPair();
const CLIENT = generateWireguardKeyPair().publicKey;
const keyed = (settings: Record<string, unknown> = {}) => ({
    tag: 'wg-in', protocol: 'wireguard', port: 51820,
    settings: { secretKey: KEY.secretKey, peers: [], ...settings },
});

describe('the secret key', () => {
    it('is reported missing on what the factory builds — above the form and beside the field', () => {
        const { container } = mount(createDefaultInbound('wireguard'));
        // Once in the notes at the top of the editor, once under the field.
        expect(screen.getAllByText(EMPTY_KEY())).toHaveLength(2);
        expect(problemsIn(container)).toEqual(['secretKey.empty']);
    });

    it('is written to settings.secretKey by Generate, and the report clears', () => {
        const { container, current, iface } = mount(createDefaultInbound('wireguard'));
        fireEvent.click(iface().getByText(t("Generate a key")));

        const secret = current().settings.secretKey;
        expect(parseWireguardKey(secret)).toHaveLength(32);
        // The half a client is given, worked out rather than stored.
        expect(valueOf(iface().getByLabelText(t("Public Key")))).toBe(wireguardPublicKey(secret)!);
        expect(current().settings.publicKey).toBeUndefined();

        expect(screen.queryByText(EMPTY_KEY())).toBeNull();
        expect(problemsIn(container)).toEqual([]);
        // Nothing else was wrong with it: the notes are gone altogether.
        expect(screen.queryByText(t("Checked against Xray {tag}", { tag: 'v26.7.28' }))).toBeNull();
    });

    it('can be generated from the note itself, which is nearer the thumb than the card', () => {
        const { current } = mount(createDefaultInbound('wireguard'));
        // First in the document: the one in the notes.
        fireEvent.click(screen.getAllByText(t("Generate a key"))[0]!);
        expect(parseWireguardKey(current().settings.secretKey)).toHaveLength(32);
        expect(screen.queryByText(EMPTY_KEY())).toBeNull();
    });

    it('is written as typed, and judged as the core would judge it', () => {
        const { container, current, iface } = mount(createDefaultInbound('wireguard'));
        const field = iface().getByLabelText(t("Secret Key"));

        type(field, 'not a key!');
        expect(current().settings.secretKey).toBe('not a key!');
        expect(problemsIn(container)).toEqual(['secretKey.invalid']);
        expect(valueOf(iface().getByLabelText(t("Public Key")))).toBe('');

        type(field, KEY.secretKey);
        expect(current().settings.secretKey).toBe(KEY.secretKey);
        expect(problemsIn(container)).toEqual([]);
        expect(valueOf(iface().getByLabelText(t("Public Key")))).toBe(KEY.publicKey);
    });

    it('is not replaced on one press once there is one', () => {
        const { current, iface } = mount(keyed());
        fireEvent.click(iface().getByText(t("Generate a new key")));
        expect(current().settings.secretKey).toBe(KEY.secretKey);

        fireEvent.click(iface().getByText(t("Cancel")));
        expect(current().settings.secretKey).toBe(KEY.secretKey);

        fireEvent.click(iface().getByText(t("Generate a new key")));
        fireEvent.click(iface().getByText(t("Replace the key")));
        expect(current().settings.secretKey).not.toBe(KEY.secretKey);
        expect(parseWireguardKey(current().settings.secretKey)).toHaveLength(32);
    });

    it('hands the public key to the clipboard', () => {
        const copied: string[] = [];
        // Replaced on the object itself, by property rather than by a quoted
        // name: the icon map is built from every quoted word in src/ that
        // happens to be an icon's name, test files included.
        const board = navigator.clipboard;
        const original = board.writeText;
        board.writeText = async (text: string) => {
            copied.push(text);
        };
        try {
            const { iface } = mount(keyed());
            fireEvent.click(iface().getByText(t("Copy public key")));
            expect(copied).toEqual([KEY.publicKey]);
        } finally {
            board.writeText = original;
        }
    });
});

describe('the interface', () => {
    it('writes the MTU as a number, and leaves it out when cleared', () => {
        const { current, iface } = mount(keyed({ mtu: 1420 }));
        const field = iface().getByLabelText(t("MTU"));
        expect(valueOf(field)).toBe('1420');

        type(field, '1380');
        expect(current().settings.mtu).toBe(1380);

        // Left out, the core uses its own 1420 — not a 0 this form invented.
        type(field, '');
        expect('mtu' in current().settings).toBe(false);
    });

    it('writes the address as a list, one entry per address', () => {
        const { current, iface } = mount(keyed());
        const field = iface().getByLabelText(t("Interface address"));

        type(field, '10.8.0.1/32, fd00::1/128');
        expect(current().settings.address).toEqual(['10.8.0.1/32', 'fd00::1/128']);

        // A comma still being typed stays in the box and out of the config,
        // where an empty entry would be an address the core refuses.
        type(field, '10.8.0.1/32, ');
        expect(valueOf(field)).toBe('10.8.0.1/32, ');
        expect(current().settings.address).toEqual(['10.8.0.1/32']);
    });

    it('leaves the address out when cleared, so the core uses its default', () => {
        const { current, iface } = mount(keyed({ address: ['10.8.0.1/32'] }));
        type(iface().getByLabelText(t("Interface address")), '');
        // Not `[]`: that is an interface with no address at all.
        expect('address' in current().settings).toBe(false);
    });

    it('says an empty address list is not the same as none, and removes it', () => {
        const { container, current } = mount(keyed({ address: [] }));
        const note = container.querySelector('[data-empty-list="address"]') as HTMLElement;
        fireEvent.click(within(note).getByText(t("Remove {alias}", { alias: 'address' })));
        expect('address' in current().settings).toBe(false);
        expect(container.querySelector('[data-empty-list]')).toBeNull();
    });

    it('says an address the chosen line refuses, next to the field', () => {
        // /24 is an interface address from 26.7 and not on 26.3.
        onLine('26.3');
        let view = mount(keyed({ address: ['10.0.0.1/24'] }));
        expect(problemsIn(view.card('interface'))).toEqual(['address']);
        cleanup();
        onLine('26.7');
        view = mount(keyed({ address: ['10.0.0.1/24'] }));
        expect(problemsIn(view.card('interface'))).toEqual([]);
    });
});

describe('peers', () => {
    it('starts with none, and says what that means', () => {
        const { peers, container } = mount(keyed());
        expect(peers().getByText(t("No peers yet. The inbound loads without any — and nobody can connect to it."))).toBeDefined();
        expect(container.querySelector('[data-peer]')).toBeNull();
    });

    it('adds a peer under settings.peers with an address of its own', () => {
        const { current, peers, container } = mount(keyed());
        fireEvent.click(peers().getByText(t("Add Peer")));
        expect(current().settings.peers).toEqual([{ publicKey: '', allowedIPs: ['10.0.0.2/32'] }]);
        // Honest about the new one too: it is nobody until it has a key.
        expect(problemsIn(container)).toEqual(['publicKey.empty']);

        fireEvent.click(peers().getByText(t("Add Peer")));
        expect(current().settings.peers.map((peer: any) => peer.allowedIPs)).toEqual([['10.0.0.2/32'], ['10.0.0.3/32']]);
    });

    it('writes each field of a peer to that peer', () => {
        const { current, peer, peers, container } = mount(keyed({ peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'] }] }));
        fireEvent.click(peers().getByText(t("Add Peer")));

        type(peer(1).getByLabelText(t("Public Key")), CLIENT);
        type(peer(1).getByLabelText(t("Allowed IPs")), '10.0.0.9/32, fd00::9/128');
        type(peer(1).getByLabelText(t("Keep-alive (s)")), '25');
        type(peer(1).getByLabelText(t("Email")), 'phone@home');
        type(peer(1).getByLabelText(t("User Level")), '1');
        fireEvent.click(peer(1).getByLabelText(t("Generate a pre-shared key")));

        const [first, second] = current().settings.peers;
        // The neighbour is untouched.
        expect(first).toEqual({ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'] });
        expect(parseWireguardKey(second.preSharedKey)).toHaveLength(32);
        expect({ ...second, preSharedKey: undefined }).toEqual({
            publicKey: CLIENT,
            allowedIPs: ['10.0.0.9/32', 'fd00::9/128'],
            keepAlive: 25,
            email: 'phone@home',
            level: 1,
            preSharedKey: undefined,
        });
        expect(problemsIn(container)).toEqual([]);
    });

    it('drops an optional field that is emptied rather than writing an empty one', () => {
        const { current, peer } = mount(keyed({
            peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'], preSharedKey: KEY.secretKey, keepAlive: 25, email: 'a@b' }],
        }));
        type(peer(0).getByLabelText(t("Pre-shared Key")), '');
        type(peer(0).getByLabelText(t("Keep-alive (s)")), '');
        type(peer(0).getByLabelText(t("Email")), '');
        type(peer(0).getByLabelText(t("Allowed IPs")), '');
        expect(current().settings.peers).toEqual([{ publicKey: CLIENT }]);
    });

    it('says what is wrong with a peer inside that peer', () => {
        const { container } = mount(keyed({
            peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'] }, { publicKey: 'not a key!', allowedIPs: ['10.0.0.3'] }],
        }));
        expect(problemsIn(container.querySelector('[data-peer="0"]') as HTMLElement)).toEqual([]);
        expect(problemsIn(container.querySelector('[data-peer="1"]') as HTMLElement)).toEqual(['publicKey.invalid', 'allowedIPs']);
    });

    it('removes the peer asked for', () => {
        const other = generateWireguardKeyPair().publicKey;
        const { current, peer } = mount(keyed({ peers: [{ publicKey: CLIENT }, { publicKey: other }] }));
        fireEvent.click(peer(0).getByText(t("Remove peer")));
        expect(current().settings.peers).toEqual([{ publicKey: other }]);
    });

    it('says an empty allowedIPs list lets the peer send nothing, and removes it', () => {
        const { container, current } = mount(keyed({ peers: [{ publicKey: CLIENT, allowedIPs: [] }] }));
        const note = container.querySelector('[data-empty-list="allowedIPs"]') as HTMLElement;
        fireEvent.click(within(note).getByText(t("Remove {alias}", { alias: 'allowedIPs' })));
        expect(current().settings.peers).toEqual([{ publicKey: CLIENT }]);
    });
});

describe('what each line reads', () => {
    const labels = (container: HTMLElement) => Array.from(container.querySelectorAll('label')).map(label => label.textContent ?? '');
    const peerOnly = { peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'] }] };

    it('offers a peer an email and a level from 26.7, not on 26.3', () => {
        onLine('26.3');
        let view = mount(keyed(peerOnly));
        expect(labels(view.card('peers'))).not.toContain(t("Email"));
        expect(labels(view.card('peers'))).not.toContain(t("User Level"));
        cleanup();

        for (const line of ['26.7', '26.9'] as const) {
            onLine(line);
            view = mount(keyed(peerOnly));
            expect(labels(view.card('peers'))).toContain(t("Email"));
            expect(labels(view.card('peers'))).toContain(t("User Level"));
            cleanup();
        }
    });

    it('offers workers on 26.3 only', () => {
        onLine('26.3');
        let view = mount(keyed());
        type(view.iface().getByLabelText(t("Workers")), '4');
        expect(view.current().settings.workers).toBe(4);
        cleanup();

        onLine('26.7');
        view = mount(keyed());
        expect(labels(view.card('interface'))).not.toContain(t("Workers"));
    });

    it('still shows what a config holds on a line that does not read it', () => {
        // Shown, not dropped: the value is in the config whether or not this
        // line reads it, and the notes above say it does nothing.
        onLine('26.7');
        let view = mount(keyed({ workers: 4 }));
        expect(valueOf(view.iface().getByLabelText(t("Workers")))).toBe('4');
        // Under the field, in the open, and in the notes with a way to remove it.
        expect(statusesIn(view.container)).toEqual(['workers']);
        expect(view.iface().getByText(t("Only Xray 26.3 reads this; {tag} drops it, so it does nothing here.", { tag: 'v26.7.28' }))).toBeDefined();
        expect(screen.getByText(t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what: 'settings.workers', tag: 'v26.7.28' }))).toBeDefined();
        cleanup();

        onLine('26.3');
        view = mount(keyed({ peers: [{ publicKey: CLIENT, email: 'a@b', level: 2 }] }));
        expect(valueOf(view.peer(0).getByLabelText(t("Email")))).toBe('a@b');
        expect(valueOf(view.peer(0).getByLabelText(t("User Level")))).toBe('2');
        expect(statusesIn(view.container)).toEqual(['email', 'level']);
        cleanup();

        // Where the line reads them there is no status to show.
        onLine('26.9');
        view = mount(keyed({ peers: [{ publicKey: CLIENT, email: 'a@b', level: 2 }] }));
        expect(statusesIn(view.container)).toEqual([]);
    });

    it('does not offer a peer an endpoint, and shows one the config has', () => {
        let view = mount(keyed(peerOnly));
        expect(labels(view.card('peers'))).not.toContain(t("Endpoint"));
        cleanup();

        view = mount(keyed({ peers: [{ publicKey: CLIENT, endpoint: '203.0.113.5:51820' }] }));
        expect(valueOf(view.peer(0).getByLabelText(t("Endpoint")))).toBe('203.0.113.5:51820');
        // 26.7 keeps nothing of it on a server, and the card says so in the open.
        expect(statusesIn(view.container)).toEqual(['endpoint']);
        expect(view.peer(0).getByText(t("Xray {tag} does not use a peer's endpoint on an inbound: it learns the address when the peer calls. It does nothing here.", { tag: 'v26.7.28' }))).toBeDefined();
        fireEvent.click(view.peer(0).getByText(t("Remove {alias}", { alias: 'endpoint' })));
        expect(view.current().settings.peers).toEqual([{ publicKey: CLIENT }]);
        cleanup();

        // 26.3 does pass it to the device, so there it reads differently.
        onLine('26.3');
        view = mount(keyed({ peers: [{ publicKey: CLIENT, endpoint: '203.0.113.5:51820' }] }));
        expect(view.peer(0).getByText(t("Where Xray {tag} first sends to this peer. A server usually leaves it out and learns the address when the peer calls.", { tag: 'v26.3.27' }))).toBeDefined();
    });

    it('does not offer what only a client uses, and shows it when the config has it', () => {
        let view = mount(keyed());
        expect(view.container.querySelector('[data-wireguard="client-only"]')).toBeNull();
        cleanup();

        view = mount(keyed({ reserved: [1, 2, 3], noKernelTun: true }));
        const held = view.container.querySelector('[data-wireguard="client-only"]') as HTMLElement;
        expect(held.textContent).toContain('reserved');
        expect(held.textContent).toContain('[1,2,3]');
        expect(held.textContent).toContain('noKernelTun');
        // Kept until someone says otherwise.
        expect(view.current().settings.reserved).toEqual([1, 2, 3]);
        fireEvent.click(within(held).getByText(t("Remove {alias}", { alias: 'reserved' })));
        expect('reserved' in view.current().settings).toBe(false);
        expect(view.current().settings.noKernelTun).toBe(true);
    });
});

describe('on a phone', () => {
    /** The last row of a block is where its buttons are — never the header. */
    const foot = (block: HTMLElement) => block.lastElementChild as HTMLElement;

    it('puts every button at the foot of the block it acts on', () => {
        globalThis.setViewportWidth(375);
        try {
            const { card, container } = mount(keyed({ peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2/32'] }] }));
            expect(within(foot(card('interface'))).getByText(t("Generate a new key"))).toBeDefined();
            expect(within(foot(card('interface'))).getByText(t("Copy public key"))).toBeDefined();
            expect(within(foot(card('peers'))).getByText(t("Add Peer"))).toBeDefined();
            expect(within(foot(container.querySelector('[data-peer="0"]') as HTMLElement)).getByText(t("Remove peer"))).toBeDefined();
            // Nothing to press in a heading.
            for (const heading of Array.from(container.querySelectorAll('h4'))) {
                expect(heading.querySelector('button')).toBeNull();
            }
        } finally {
            globalThis.setViewportWidth(1280);
        }
    });
});
