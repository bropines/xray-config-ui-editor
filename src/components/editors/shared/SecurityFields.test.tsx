import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TransportSettings } from './TransportSettings';
import { useConfigStore } from '../../../store/configStore';
import { CORE_VERSIONS, type CoreVersionId } from '../../../core/xray/versions';

/**
 * Three TLS / REALITY fields the form used to write in a type or a format the
 * core does not take — a string where it decodes a struct, Base64 where it
 * decodes hex. Each test here ends on what lands in the config, because that
 * is the only place the bug was ever visible: the form looked fine.
 *
 * All three behave the same on 26.3, 26.7 and 26.9 (see
 * core/xray/security-fields), so the line only matters where a test says so.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

const draw = (streamSettings: any, isClient: boolean) => {
    const writes: any[] = [];
    const view = render(
        <TransportSettings
            streamSettings={streamSettings}
            onChange={next => writes.push(next)}
            isClient={isClient}
            protocol="vless"
        />,
    );
    /** Opens an Extended section that nothing in the config has opened yet. */
    const open = (title: string) => {
        const header = Array.from(view.container.querySelectorAll('button'))
            .find(button => (button.textContent ?? '').includes(title));
        if (header && !view.container.querySelector('[data-fallback-limit], [data-ech-sockopt]')) fireEvent.click(header);
    };
    return { ...view, writes, last: () => writes[writes.length - 1], open };
};

const type = (input: Element | null, value: string) => {
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value } });
};

// ── REALITY fallback limits ────────────────────────────────────────────

const server = (realitySettings: any = {}) => ({
    network: 'tcp',
    security: 'reality',
    realitySettings: { target: 'example.com:443', serverNames: ['example.com'], privateKey: 'k', shortIds: ['ab'], ...realitySettings },
});

const limitField = (container: HTMLElement, name: string, key: string) =>
    container.querySelector(`[data-fallback-limit="${name}"] [data-limit-field="${key}"] input`);

describe('REALITY fallback limits', () => {
    it('are drawn as their three numbers, for both directions', () => {
        const { container, open } = draw(server(), false);
        open('Extended REALITY Settings');
        for (const name of ['limitFallbackUpload', 'limitFallbackDownload']) {
            for (const key of ['bytesPerSec', 'afterBytes', 'burstBytesPerSec']) {
                const input = limitField(container, name, key) as HTMLInputElement;
                expect(input).not.toBeNull();
                expect(input.type).toBe('number');
            }
        }
        // The units are on the page, not left to the key's name.
        expect(container.textContent).toContain('bytes/s');
    });

    it('write an object of numbers — the struct the core decodes', () => {
        const { container, open, last } = draw(server(), false);
        open('Extended REALITY Settings');
        type(limitField(container, 'limitFallbackUpload', 'bytesPerSec'), '1048576');

        const written = last().realitySettings.limitFallbackUpload;
        expect(written).toEqual({ bytesPerSec: 1048576 });
        expect(typeof written).toBe('object');
        expect(typeof written.bytesPerSec).toBe('number');
        // And nothing else in realitySettings moved.
        expect(last().realitySettings.privateKey).toBe('k');
    });

    it('keep the other numbers when one is edited', () => {
        const { container, last } = draw(server({ limitFallbackDownload: { afterBytes: 1024, bytesPerSec: 100 } }), false);
        type(limitField(container, 'limitFallbackDownload', 'burstBytesPerSec'), '4096');
        expect(last().realitySettings.limitFallbackDownload).toEqual({ afterBytes: 1024, bytesPerSec: 100, burstBytesPerSec: 4096 });
    });

    it('remove the key once the last number is cleared, rather than leaving "" or {}', () => {
        const { container, last } = draw(server({ limitFallbackUpload: { bytesPerSec: 1000 } }), false);
        type(limitField(container, 'limitFallbackUpload', 'bytesPerSec'), '');
        expect('limitFallbackUpload' in last().realitySettings).toBe(false);
    });

    it('remove the key from the button too', () => {
        const { container, last } = draw(server({ limitFallbackUpload: { bytesPerSec: 1000, afterBytes: 5 } }), false);
        const remove = Array.from(container.querySelectorAll('[data-fallback-limit="limitFallbackUpload"] button'))
            .find(button => /Remove this limit/.test(button.textContent ?? ''))!;
        fireEvent.click(remove);
        expect('limitFallbackUpload' in last().realitySettings).toBe(false);
    });

    it('show a held number with what it comes to', () => {
        const { container } = draw(server({ limitFallbackUpload: { bytesPerSec: 1048576 } }), false);
        expect((limitField(container, 'limitFallbackUpload', 'bytesPerSec') as HTMLInputElement).value).toBe('1048576');
        expect(container.textContent).toContain('1 MiB/s');
    });

    it('say when a limit cannot do anything', () => {
        const { container } = draw(server({ limitFallbackUpload: { afterBytes: 1024 } }), false);
        expect(container.textContent).toContain('With no rate set');
    });

    it('show the string the old form wrote, say the core refuses it, and remove it', () => {
        const { container, last } = draw(server({ limitFallbackUpload: '1048576' }), false);
        const notice = container.querySelector('[data-wrong-type="limitFallbackUpload"]')!;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain('"1048576"');
        expect(notice.textContent).toContain('cannot read the config');
        // It is not drawn into a field as though it were a number.
        expect((limitField(container, 'limitFallbackUpload', 'bytesPerSec') as HTMLInputElement).value).toBe('');

        fireEvent.click(notice.querySelector('button')!);
        expect('limitFallbackUpload' in last().realitySettings).toBe(false);
    });

    it('replace that string with an object as soon as a number is typed', () => {
        const { container, last } = draw(server({ limitFallbackDownload: 'fast' }), false);
        type(limitField(container, 'limitFallbackDownload', 'bytesPerSec'), '2000');
        expect(last().realitySettings.limitFallbackDownload).toEqual({ bytesPerSec: 2000 });
    });

    it('show a sub-field a uint64 cannot take, next to that field', () => {
        const { container } = draw(server({ limitFallbackUpload: { bytesPerSec: '1000' } }), false);
        const field = container.querySelector('[data-fallback-limit="limitFallbackUpload"] [data-limit-field="bytesPerSec"]')!;
        expect(field.textContent).toContain('"1000"');
        expect(field.textContent).toContain('whole number of bytes');
    });

    it('are a server\'s: not offered to a client, shown to one that holds them', () => {
        const client = { network: 'tcp', security: 'reality', realitySettings: { serverName: 'example.com', password: 'p' } };
        const offered = draw(client, true);
        offered.open('Extended REALITY Settings');
        expect(offered.container.querySelector('[data-fallback-limit]')).toBeNull();
        cleanup();

        const held = draw({ ...client, realitySettings: { ...client.realitySettings, limitFallbackUpload: { bytesPerSec: 5 } } }, true);
        expect(held.container.querySelector('[data-fallback-limit="limitFallbackUpload"]')).not.toBeNull();
        expect(held.container.textContent).toContain('server-side fields on a client outbound');
    });

    it('are the same on every supported line', () => {
        for (const { id } of CORE_VERSIONS) {
            onLine(id);
            const { container, open, last } = draw(server(), false);
            open('Extended REALITY Settings');
            type(limitField(container, 'limitFallbackDownload', 'afterBytes'), '10');
            expect(last().realitySettings.limitFallbackDownload).toEqual({ afterBytes: 10 });
            cleanup();
        }
    });
});

// ── tlsSettings.echSockopt ─────────────────────────────────────────────

const tlsClient = (tlsSettings: any = {}) => ({
    network: 'tcp',
    security: 'tls',
    tlsSettings: { serverName: 'example.com', ...tlsSettings },
});

const echButton = (container: HTMLElement, label: RegExp) =>
    Array.from(container.querySelectorAll('[data-ech-sockopt] button'))
        .find(button => label.test(button.textContent ?? ''));

describe('echSockopt', () => {
    it('is the socket options editor, not a text input', () => {
        const { container, open } = draw(tlsClient(), true);
        open('Extended TLS Settings');
        const block = container.querySelector('[data-ech-sockopt]')!;
        expect(block).not.toBeNull();
        expect(block.textContent).toContain('echSockopt');
        // Until it is added there is nothing to type into at all.
        expect(block.querySelectorAll('input')).toHaveLength(0);
    });

    it('is added as an object', () => {
        const { container, open, last } = draw(tlsClient(), true);
        open('Extended TLS Settings');
        fireEvent.click(echButton(container, /^ADD$/)!);
        expect(last().tlsSettings.echSockopt).toEqual({});
        expect(last().tlsSettings.serverName).toBe('example.com');
    });

    it('writes its fields as the types SocketConfig decodes', () => {
        const { container, last } = draw(tlsClient({ echSockopt: {} }), true);
        type(container.querySelector('[data-ech-sockopt] input[type="number"]'), '255');
        const written = last().tlsSettings.echSockopt;
        expect(written).toEqual({ mark: 255 });
        expect(typeof written.mark).toBe('number');
        // The stream's own sockopt is another key and another socket.
        expect(last().sockopt).toBeUndefined();
    });

    it('draws the dialing half, since this socket is only ever dialed', () => {
        const { container } = draw(tlsClient({ echSockopt: {} }), false);
        const block = container.querySelector('[data-ech-sockopt]')!;
        expect(block.textContent).toContain('Dialer Proxy');
        expect(block.textContent).not.toContain('TProxy');
    });

    it('is removed as a key, not emptied', () => {
        const { container, last } = draw(tlsClient({ echSockopt: { mark: 255 } }), true);
        fireEvent.click(echButton(container, /^REMOVE$/)!);
        expect('echSockopt' in last().tlsSettings).toBe(false);
    });

    it('shows the string the old form wrote, says the core refuses it, and removes it', () => {
        const { container, last } = draw(tlsClient({ echSockopt: 'eth0' }), true);
        const notice = container.querySelector('[data-wrong-type="echSockopt"]')!;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain('"eth0"');
        expect(notice.textContent).toContain('cannot read the config');
        fireEvent.click(notice.querySelector('button')!);
        expect('echSockopt' in last().tlsSettings).toBe(false);
    });

    it('replaces that string with an object when added again', () => {
        const { container, last } = draw(tlsClient({ echSockopt: 'eth0' }), true);
        fireEvent.click(echButton(container, /^ADD$/)!);
        expect(last().tlsSettings.echSockopt).toEqual({});
    });

    it('is a client\'s: not offered to a server, shown to one that holds it', () => {
        const serverTls = { network: 'tcp', security: 'tls', tlsSettings: {} };
        const offered = draw(serverTls, false);
        offered.open('Extended TLS Settings');
        expect(offered.container.querySelector('[data-ech-sockopt]')).toBeNull();
        cleanup();

        const held = draw({ ...serverTls, tlsSettings: { echSockopt: { mark: 1 } } }, false);
        expect(held.container.querySelector('[data-ech-sockopt]')).not.toBeNull();
        expect(held.container.textContent).toContain('client-side fields on a server inbound');
    });

    it('is offered on every supported line', () => {
        for (const { id } of CORE_VERSIONS) {
            onLine(id);
            const { container, open } = draw(tlsClient(), true);
            open('Extended TLS Settings');
            expect(container.querySelector('[data-ech-sockopt]')).not.toBeNull();
            cleanup();
        }
    });
});

// ── tlsSettings.pinnedPeerCertSha256 ───────────────────────────────────

const HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const HASH_BASE64 = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

const pinInput = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('input'))
        .find(input => /hex/.test((input as HTMLInputElement).placeholder)) as HTMLInputElement | undefined;

describe('pinnedPeerCertSha256', () => {
    it('asks for hex, and no longer for Base64', () => {
        const { container, open } = draw(tlsClient(), true);
        open('Extended TLS Settings');
        const input = pinInput(container)!;
        expect(input).toBeDefined();
        expect(input.placeholder).toContain('64 hex digits');
        expect(input.placeholder).not.toMatch(/base64/i);
    });

    it('writes the hash as the string the core splits and decodes', () => {
        const { container, open, last } = draw(tlsClient(), true);
        open('Extended TLS Settings');
        type(pinInput(container)!, HASH);
        expect(last().tlsSettings.pinnedPeerCertSha256).toBe(HASH);
    });

    it('removes the key when cleared', () => {
        const { container, last } = draw(tlsClient({ pinnedPeerCertSha256: HASH }), true);
        type(pinInput(container)!, '');
        expect('pinnedPeerCertSha256' in last().tlsSettings).toBe(false);
    });

    it('has nothing to say about hex, with colons or several at once', () => {
        const colons = HASH.match(/../g)!.join(':').toUpperCase();
        for (const value of [HASH, colons, `${HASH}, ${colons}`]) {
            const { container } = draw(tlsClient({ pinnedPeerCertSha256: value }), true);
            expect(pinInput(container)!.value).toBe(value);
            expect(container.textContent).not.toContain('is not hex');
            expect(container.textContent).not.toContain('hex digits where');
            cleanup();
        }
    });

    it('flags a Base64 hash: the config would not load', () => {
        const { container } = draw(tlsClient({ pinnedPeerCertSha256: HASH_BASE64 }), true);
        // Still drawn — it is what the config holds.
        expect(pinInput(container)!.value).toBe(HASH_BASE64);
        expect(container.textContent).toContain('is not hex');
        expect(container.textContent).toContain('v26.7.28');
    });

    it('flags hex of the wrong length', () => {
        const { container } = draw(tlsClient({ pinnedPeerCertSha256: HASH.slice(0, 40) }), true);
        expect(container.textContent).toContain('40 hex digits where a SHA-256 hash has 64');
    });

    it('flags the one bad hash in a list', () => {
        const { container } = draw(tlsClient({ pinnedPeerCertSha256: `${HASH},sha256/abc` }), true);
        expect(container.textContent).toContain('“sha256/abc” is not hex');
    });

    it('flags a value that pins nothing', () => {
        const { container } = draw(tlsClient({ pinnedPeerCertSha256: ' , ' }), true);
        expect(container.textContent).toContain('pins nothing');
    });

    it('names the line it is being written for', () => {
        onLine('26.9');
        const { container } = draw(tlsClient({ pinnedPeerCertSha256: HASH_BASE64 }), true);
        expect(container.textContent).toContain('v26.9.9');
    });
});
