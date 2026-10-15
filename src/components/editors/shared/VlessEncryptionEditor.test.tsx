import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useEffect } from 'react';
import { VlessEncryptionEditor } from './VlessEncryptionEditor';
import { useInboundEditor } from '../../../hooks/useInboundEditor';
import { useXrayEditor } from '../../../hooks/useXrayEditor';
import { useConfigStore } from '../../../store/configStore';
import { createDefaultInbound, createDefaultOutbound } from '../../../core/generators/endpoint-factory';
import { deriveClientEncryption, generateVlessEncryption } from '../../../core/generators/vless-encryption';
import { readVlessEncryption, splitVlessEncryption } from '../../../core/xray/vless-encryption';
import { runFullDiagnostics } from '../../../core/diagnostics';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * VLESS Encryption had no editor: the factory wrote `decryption: "none"` and
 * `encryption: "none"`, and the only way to anything else was raw JSON — and a
 * pair of strings made by hand with a tool and pasted in. These draw the card
 * over the editors' real state and read back what it wrote.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

const mountInbound = (data: any) => {
    const seen: any[] = [];
    const Harness = () => {
        const { local, updateField } = useInboundEditor(data, () => {});
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return <VlessEncryptionEditor side="inbound" item={local} onChange={updateField} />;
    };
    const view = render(<Harness />);
    return { ...view, current: () => JSON.parse(JSON.stringify(seen[seen.length - 1])) };
};

const mountOutbound = (data: any, props: { offered?: boolean } = {}) => {
    const seen: any[] = [];
    const Harness = () => {
        const { local, updateField } = useXrayEditor<any>({ data, onSave: () => {}, validate: () => [] });
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return <VlessEncryptionEditor side="outbound" item={local} onChange={updateField} {...props} />;
    };
    const view = render(<Harness />);
    return { ...view, current: () => JSON.parse(JSON.stringify(seen[seen.length - 1])) };
};

const inboundWith = (decryption: unknown, settings: Record<string, unknown> = {}) => ({
    ...createDefaultInbound('vless'),
    settings: { clients: [{ id: 'u' }], ...(decryption === undefined ? {} : { decryption }), ...settings },
});

const outboundWith = (encryption: unknown) => ({
    ...createDefaultOutbound('vless'),
    settings: { vnext: [{ address: '203.0.113.5', port: 443, users: [{ id: 'u', ...(encryption === undefined ? {} : { encryption }) }] }] },
});

const press = (name: string) => fireEvent.click(screen.getByText(name));
const pill = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const problemsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-problem]')).map(node => node.getAttribute('data-problem'));
const clientString = (container: HTMLElement) =>
    (container.querySelector('[data-client-encryption]') as HTMLTextAreaElement | null)?.value;
const stateOf = (container: HTMLElement) => container.querySelector('[data-status="state"]')?.textContent;

describe('the inbound, as the factory makes it', () => {
    it('is off: "none", no problems, and the two ways to turn it on', () => {
        const { container } = mountInbound(createDefaultInbound('vless'));
        expect(stateOf(container)).toBe(t("Off"));
        expect(valueOf(t("Decryption"))).toBe('none');
        expect(problemsIn(container)).toEqual([]);
        expect(screen.getByText(t("Generate X25519 key"))).toBeDefined();
        expect(screen.getByText(t("Generate ML-KEM-768 key"))).toBeDefined();
        // Off has no clients to tell anything.
        expect(clientString(container)).toBeUndefined();
        expect(screen.queryByText(t("Switch off"))).toBeNull();
    });
});

describe('generating', () => {
    it('writes what `xray vlessenc` writes for X25519, and shows what the clients need', () => {
        const { container, current } = mountInbound(createDefaultInbound('vless'));
        press(t("Generate X25519 key"));

        const decryption = current().settings.decryption as string;
        const reading = readVlessEncryption(decryption, 'server', 'd');
        expect(reading.usable).toBe(true);
        expect(reading.keys.map(key => key.kind)).toEqual(['x25519']);
        expect(decryption.split('.').slice(0, 3)).toEqual(['mlkem768x25519plus', 'native', '600s']);
        expect(decryption.split('.')).toHaveLength(4);

        const derived = deriveClientEncryption(decryption);
        expect(derived.ok).toBe(true);
        expect(clientString(container)).toBe(derived.ok ? derived.encryption : '');
        expect(stateOf(container)).toBe(t("On · X25519"));
        expect(problemsIn(container)).toEqual([]);
    });

    it('writes an ML-KEM-768 seed, and a client string with the 1184-byte public key', () => {
        const { container, current } = mountInbound(createDefaultInbound('vless'));
        press(t("Generate ML-KEM-768 key"));

        const decryption = current().settings.decryption as string;
        expect(readVlessEncryption(decryption, 'server', 'd').keys.map(key => key.bytes.length)).toEqual([64]);
        const client = clientString(container)!;
        const read = readVlessEncryption(client, 'client', 'e');
        expect(read.usable).toBe(true);
        expect(read.keys.map(key => key.bytes.length)).toEqual([1184]);
        expect(stateOf(container)).toBe(t("On · ML-KEM-768"));
        expect(screen.getByText(t("Paste it into each client's VLESS Encryption card, in its outbound. An ML-KEM-768 public key is 1184 bytes, so this string is long; copy it rather than typing it."))).toBeDefined();
    });

    it('uses the choices made before there was a key', () => {
        const { current } = mountInbound(createDefaultInbound('vless'));
        pill('xorpub');
        type(t("Ticket lifetime"), '300-600s');
        type(t("Padding"), '100-111-1111.75-0-111');
        press(t("Generate X25519 key"));
        expect(splitVlessEncryption(current().settings.decryption)).toMatchObject({
            appearance: 'xorpub', ticket: '300-600s', padding: '100-111-1111.75-0-111',
        });
    });

    it('falls back to the defaults for a choice that is not valid, rather than write a string Xray refuses', () => {
        const { current } = mountInbound(createDefaultInbound('vless'));
        type(t("Ticket lifetime"), 'soon');
        type(t("Padding"), '1-2');
        press(t("Generate X25519 key"));
        const parts = splitVlessEncryption(current().settings.decryption)!;
        expect(parts.ticket).toBe('600s');
        expect(parts.padding).toBe('');
        expect(readVlessEncryption(current().settings.decryption, 'server', 'd').usable).toBe(true);
    });
});

describe('a key in use', () => {
    const pair = generateVlessEncryption('x25519');

    it('takes a second press to replace, and says why', () => {
        const { current, container } = mountInbound(inboundWith(pair.decryption));
        press(t("New X25519 key"));
        expect(current().settings.decryption).toBe(pair.decryption);
        expect(container.querySelector('[data-status="replace"]')).not.toBeNull();

        press(t("Cancel"));
        expect(current().settings.decryption).toBe(pair.decryption);
        expect(container.querySelector('[data-status="replace"]')).toBeNull();

        press(t("New ML-KEM-768 key"));
        press(t("Replace the key"));
        const next = readVlessEncryption(current().settings.decryption, 'server', 'd');
        expect(next.usable).toBe(true);
        expect(next.keys.map(key => key.kind)).toEqual(['mlkem768']);
    });

    it('keeps the choices when it is replaced', () => {
        const held = generateVlessEncryption('x25519', { appearance: 'random', lifetime: '120s', padding: '100-111-1111' });
        const { current } = mountInbound(inboundWith(held.decryption));
        press(t("New ML-KEM-768 key"));
        press(t("Replace the key"));
        expect(splitVlessEncryption(current().settings.decryption)).toMatchObject({ appearance: 'random', ticket: '120s', padding: '100-111-1111' });
    });

    it('rewrites the string around the key when a choice changes, and the client string follows', () => {
        const { current, container } = mountInbound(inboundWith(pair.decryption));
        const key = pair.decryption.split('.')[3];
        pill('random');
        expect(current().settings.decryption).toBe(`mlkem768x25519plus.random.600s.${key}`);
        type(t("Ticket lifetime"), '900s');
        type(t("Padding"), '100-35-35');
        expect(current().settings.decryption).toBe(`mlkem768x25519plus.random.900s.100-35-35.${key}`);

        const derived = deriveClientEncryption(current().settings.decryption);
        expect(clientString(container)).toBe(derived.ok ? derived.encryption : '');
        expect(clientString(container)).toContain('.random.0rtt.100-35-35.');
    });

    it('lets the client string be 1rtt', () => {
        const { container } = mountInbound(inboundWith(pair.decryption));
        const resumption = within(container.querySelector('[data-vless-clients]') as HTMLElement);
        fireEvent.click(resumption.getByRole('button', { name: '1rtt' }));
        expect(splitVlessEncryption(clientString(container))!.ticket).toBe('1rtt');
    });

    it('switches off to "none", and the clients\' block goes', () => {
        const { current, container } = mountInbound(inboundWith(pair.decryption));
        press(t("Switch off"));
        expect(current().settings.decryption).toBe('none');
        expect(clientString(container)).toBeUndefined();
        expect(stateOf(container)).toBe(t("Off"));
    });

    it('can be typed over, and reads the keys out of whatever is there', () => {
        const x = generateVlessEncryption('x25519');
        const m = generateVlessEncryption('mlkem768');
        const { container } = mountInbound(createDefaultInbound('vless'));
        type(t("Decryption"), `mlkem768x25519plus.native.600s.${x.decryption.split('.')[3]}.${m.decryption.split('.')[3]}`);
        expect(stateOf(container)).toBe(t("On · X25519 and ML-KEM-768"));
        expect(container.querySelectorAll('[data-keys] li')).toHaveLength(2);
    });
});

describe('a string the core refuses', () => {
    it('says why next to the field, with the words the diagnostics use', () => {
        const { container } = mountInbound(inboundWith('mlkem768x25519plus.native.abc.' + generateVlessEncryption('x25519').decryption.split('.')[3]));
        expect(problemsIn(container)).toEqual(['lifetime']);
        expect(stateOf(container)).toBe(t("Needs attention"));
        expect(container.querySelector('[data-client-encryption]')).toBeNull();
    });

    it('is the same list the full diagnostics make for it', () => {
        const inbound = inboundWith('mlkem768x25519plus.Native.abc.short');
        const { container } = mountInbound(inbound);
        const shown = problemsIn(container).sort();
        const diagnostics = runFullDiagnostics({ inbounds: [inbound], outbounds: [] } as any, [], '26.7')
            .filter(d => d.field === 'settings.decryption');
        expect(diagnostics.length).toBe(shown.length);
        expect(shown).toEqual(['appearance', 'key.missing', 'lifetime']);
    });

    it('says a missing decryption is missing, and offers to fill it', () => {
        const { container, current } = mountInbound(inboundWith(undefined));
        expect(problemsIn(container)).toEqual(['missing']);
        expect(stateOf(container)).toBe(t("Not set"));
        press(t("Generate X25519 key"));
        expect(readVlessEncryption(current().settings.decryption, 'server', 'd').usable).toBe(true);
    });

    it('reports fallbacks beside a key, which the core refuses', () => {
        const pair = generateVlessEncryption('x25519');
        const { container } = mountInbound(inboundWith(pair.decryption, { fallbacks: [{ dest: 80 }] }));
        expect(problemsIn(container)).toEqual(['fallbacks']);
    });

    it('reports an encryption on a user, which the core refuses', () => {
        const { container } = mountInbound(inboundWith('none', { clients: [{ id: 'u', encryption: 'none' }] }));
        expect(problemsIn(container)).toEqual(['user.encryption']);
    });

    it('shows a value of the wrong type instead of drawing over it, with a way out', () => {
        const { container, current } = mountInbound(inboundWith(5));
        expect(container.querySelector('[data-wrong-type="settings.decryption"]')).not.toBeNull();
        expect(screen.queryByLabelText(t("Decryption"))).toBeNull();
        press(t("Remove it"));
        expect(current().settings.decryption).toBeUndefined();
        expect(problemsIn(container)).toEqual(['missing']);
    });
});

describe('the outbound', () => {
    const server = generateVlessEncryption('x25519', { appearance: 'xorpub', padding: '100-111-1111.75-0-111' });
    const mlkem = generateVlessEncryption('mlkem768');
    const clientPath = (outbound: any) => outbound.settings.vnext[0].users[0].encryption;

    it('is off as the factory makes it, and draws no generate buttons — a client cannot make its own key', () => {
        const { container } = mountOutbound(createDefaultOutbound('vless'));
        expect(stateOf(container)).toBe(t("Off"));
        expect(valueOf(t("Encryption"))).toBe('none');
        expect(screen.queryByText(t("Generate X25519 key"))).toBeNull();
        expect(problemsIn(container)).toEqual([]);
    });

    it('works the client string out of a pasted server string and writes it where the core reads it', () => {
        const { container, current } = mountOutbound(createDefaultOutbound('vless'));
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: server.decryption } });
        expect(container.querySelector('[data-status="derived"]')).not.toBeNull();
        press(t("Use it"));
        expect(clientPath(current())).toBe(server.encryption);
        expect(stateOf(container)).toBe(t("On · X25519"));
        expect(valueOf(t("Encryption"))).toBe(server.encryption);
    });

    it('does the same for an ML-KEM-768 server', () => {
        const { current } = mountOutbound(createDefaultOutbound('vless'));
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: mlkem.decryption } });
        press(t("Use it"));
        expect(clientPath(current())).toBe(mlkem.encryption);
    });

    it('takes the line `xray vlessenc` prints, quotes and comma and all', () => {
        const { current } = mountOutbound(createDefaultOutbound('vless'));
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: `"decryption": "${server.decryption}",\n` } });
        press(t("Use it"));
        expect(clientPath(current())).toBe(server.encryption);
    });

    it('keeps the resumption already chosen on the card', () => {
        const { current } = mountOutbound(createDefaultOutbound('vless'));
        pill('1rtt');
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: server.decryption } });
        press(t("Use it"));
        expect(splitVlessEncryption(clientPath(current()))!.ticket).toBe('1rtt');
    });

    it('writes the flat form\'s key when the outbound is flat', () => {
        const flat = { ...createDefaultOutbound('vless'), settings: { address: '203.0.113.5', port: 443, id: 'u', encryption: 'none' } };
        const { current } = mountOutbound(flat);
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: server.decryption } });
        press(t("Use it"));
        expect(current().settings.encryption).toBe(server.encryption);
        expect(current().settings.vnext).toBeUndefined();
    });

    it('will not "Use it" for what cannot be worked out, and says what is wrong with it', () => {
        const { container } = mountOutbound(createDefaultOutbound('vless'));
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: 'mlkem768x25519plus.native.600s' } });
        expect(problemsIn(container)).toContain('shape');
        expect((screen.getByText(t("Use it")).closest('button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('says when what was pasted is already a client string', () => {
        const { container } = mountOutbound(createDefaultOutbound('vless'));
        fireEvent.change(screen.getByLabelText(t("Server's decryption")), { target: { value: server.encryption } });
        expect(container.querySelector('[data-status="already-client"]')).not.toBeNull();
        expect((screen.getByText(t("Use it")).closest('button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('reads the choices out of the string and writes them back around the key', () => {
        const { current } = mountOutbound(outboundWith(server.encryption));
        const key = server.encryption.split('.').pop();
        pill('1rtt');
        pill('native');
        expect(clientPath(current())).toBe(`mlkem768x25519plus.native.1rtt.100-111-1111.75-0-111.${key}`);
        type(t("Padding"), '');
        expect(clientPath(current())).toBe(`mlkem768x25519plus.native.1rtt.${key}`);
    });

    it('reports what the core refuses, beside the field and in the diagnostics', () => {
        const held = 'mlkem768x25519plus.native.2rtt.' + server.encryption.split('.').pop();
        const outbound = outboundWith(held);
        const { container } = mountOutbound(outbound);
        expect(problemsIn(container)).toEqual(['resumption']);
        const diagnostics = runFullDiagnostics({ inbounds: [], outbounds: [{ ...outbound, tag: 'o' }] } as any, [], '26.7')
            .filter(d => d.field === 'settings.vnext[0].users[0].encryption');
        expect(diagnostics).toHaveLength(1);
    });

    it('says a private seed is not a client key', () => {
        const seedAsClient = `mlkem768x25519plus.native.0rtt.${mlkem.decryption.split('.')[3]}`;
        const { container } = mountOutbound(outboundWith(seedAsClient));
        expect(problemsIn(container)).toEqual(['key.size']);
        expect(container.textContent).toContain(t("That is a server's private seed. A client needs the public key that goes with it — paste the server's decryption below to work it out."));
    });

    it('shows a value of the wrong type with a way out', () => {
        const { container, current } = mountOutbound(outboundWith(5));
        expect(container.querySelector('[data-wrong-type="settings.vnext[0].users[0].encryption"]')).not.toBeNull();
        press(t("Remove it"));
        expect(current().settings.vnext[0].users[0].encryption).toBeUndefined();
    });
});

describe('a line without VLESS Encryption', () => {
    it('offers nothing, and shows what it holds with a way to take it out', () => {
        const pair = generateVlessEncryption('x25519');
        const { container, current } = mountOutbound(outboundWith(pair.encryption), { offered: false });
        expect(container.querySelector('[data-status="unavailable"]')).not.toBeNull();
        expect(container.textContent).toContain(pair.encryption);
        expect(screen.queryByLabelText(t("Encryption"))).toBeNull();
        press(t("Remove {alias}", { alias: 'encryption' }));
        expect(current().settings.vnext[0].users[0].encryption).toBeUndefined();
    });
});
