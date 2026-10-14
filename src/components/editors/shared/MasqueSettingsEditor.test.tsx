import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React, { useState } from 'react';
import { generateKeyPairSync } from 'node:crypto';
import { MasqueSettingsEditor } from './MasqueSettingsEditor';
import { NetworkSection } from './NetworkSection';
import { OutboundMasque } from '../outbound/OutboundMasque';
import { InboundMasque } from '../inbound/InboundMasque';
import { useConfigStore } from '../../../store/configStore';
import { createDefaultInbound, createDefaultOutbound } from '../../../core/generators/endpoint-factory';
import type { CoreVersionId } from '../../../core/xray/versions';

/**
 * The MASQUE forms, drawn over real state: the transport's own settings
 * (host, path, credentials, headers, and from 26.10 the WARP identity), the
 * server card (users, address pool, MTU) and the outbound card. Each is read
 * back from what it wrote, since what matters is the JSON the core decodes.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.10'));
afterEach(cleanup);

const type = (input: Element | null, value: string) => fireEvent.change(input as HTMLElement, { target: { value } });
const keys = () => {
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    return {
        privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
        publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }) as string,
    };
};

/** The editor over a piece of state, and what it has written so far. */
const mountSettings = (initial: unknown, props: { isClient?: boolean; protocol?: string } = {}) => {
    let latest: unknown = initial;
    const Harness = () => {
        const [value, setValue] = useState<unknown>(initial);
        latest = value;
        return (
            <MasqueSettingsEditor
                settings={value}
                onChange={next => setValue(next)}
                isClient={props.isClient ?? true}
                protocol={props.protocol ?? 'masque'}
            />
        );
    };
    const view = render(<Harness />);
    const $ = (selector: string) => view.container.querySelector(selector);
    return {
        ...view,
        $,
        current: () => JSON.parse(JSON.stringify(latest ?? null)),
        path: () => $('input[placeholder="/.well-known/masque/ip/*/*/"]'),
        host: () => $('input[placeholder="example.com"]'),
        text: () => view.container.textContent ?? '',
    };
};

describe('the transport settings of a masque client', () => {
    it('writes the request path and host, and takes the key out when a box is emptied', () => {
        const form = mountSettings(undefined);
        type(form.path(), '/masque/{target}/{ipproto}/');
        expect(form.current()).toEqual({ path: '/masque/{target}/{ipproto}/' });
        type(form.host(), 'edge.example.com:8443');
        expect(form.current()).toEqual({ path: '/masque/{target}/{ipproto}/', host: 'edge.example.com:8443' });
        type(form.path(), '');
        type(form.host(), '');
        // Nothing left: the key itself goes, not `{}`.
        expect(form.current()).toBeNull();
    });

    it('says what the core would say about a host or path it refuses', () => {
        const form = mountSettings({ path: 'no-slash', host: 'a.example/x' });
        expect(form.text()).toContain('masqueSettings.path');
        expect(form.text()).toContain('masqueSettings.host');
        type(form.path(), '/ok');
        type(form.host(), 'a.example');
        expect(form.text()).not.toContain('refuses the config');
    });

    it('takes headers as an object of text, and says which ones the core will not take', () => {
        const form = mountSettings({ headers: { Host: 'x' } });
        expect(form.text()).toContain('masqueSettings.headers.Host');
        const headers = form.$('textarea[aria-label="Headers"]');
        type(headers, '{ "User-Agent": "chrome" }');
        expect(form.current()).toEqual({ headers: { 'User-Agent': 'chrome' } });
        expect(form.text()).not.toContain('masqueSettings.headers');
    });

    it('draws a value of the wrong type for what it is, and lets it go', () => {
        const form = mountSettings({ host: 5, path: '/ok' });
        const notice = form.$('[data-wrong-type="masqueSettings.host"]');
        expect(notice).not.toBeNull();
        fireEvent.click(notice!.querySelector('button')!);
        expect(form.current()).toEqual({ path: '/ok' });

        const whole = mountSettings('not an object');
        expect(whole.$('[data-wrong-type="masqueSettings"]')).not.toBeNull();
    });
});

describe('WARP on the masque transport', () => {
    it('is offered on 26.10 as a switch that adds the identity and takes it away', () => {
        const form = mountSettings({ path: '/' });
        const toggle = form.$('[data-masque-warp] input[type="checkbox"]') as HTMLInputElement;
        expect(toggle).not.toBeNull();
        expect(toggle.checked).toBe(false);
        fireEvent.click(toggle);
        expect(form.current()).toEqual({ path: '/', warp: {} });
        // Empty, the identity says what it is missing.
        expect(form.text()).toContain('masqueSettings.warp.privateKey');
        expect(form.text()).toContain('masqueSettings.warp.address');
        fireEvent.click(toggle);
        expect(form.current()).toEqual({ path: '/' });
    });

    it('writes the three values the core reads, each in its own type', () => {
        const { privateKey, publicKey } = keys();
        const form = mountSettings({ warp: {} });
        type(form.$('textarea[placeholder="-----BEGIN PRIVATE KEY-----"]'), privateKey);
        type(form.$('textarea[placeholder="-----BEGIN PUBLIC KEY-----"]'), publicKey);
        type(form.$('input[aria-label="Device addresses"]'), '172.16.0.2/32, 2606:4700:110:8a36::2/128');
        expect(form.current()).toEqual({
            warp: { privateKey, publicKey, address: ['172.16.0.2/32', '2606:4700:110:8a36::2/128'] },
        });
        // A good identity has nothing the core refuses.
        expect(form.text()).not.toContain('refuses the config');
    });

    it('names what is wrong with a key', () => {
        const { privateKey, publicKey } = keys();
        const form = mountSettings({ warp: { privateKey: publicKey, publicKey: privateKey, address: ['172.16.0.2', '172.16.0.3'] } });
        expect(form.text()).toContain('PKCS #8');
        expect(form.text()).toContain('PKIX');
        expect(form.text()).toContain('at most one IPv4');
    });

    it('is refused beside a user name, as the core does', () => {
        const form = mountSettings({ user: 'me', warp: {} });
        expect(form.text()).toContain('cannot be used together with warp');
    });

    it('keeps a mistyped value on screen: a warp that is not an object can be removed', () => {
        const form = mountSettings({ warp: 'cloudflare' });
        const notice = form.$('[data-wrong-type="masqueSettings.warp"]');
        expect(notice).not.toBeNull();
        fireEvent.click(notice!.querySelector('button')!);
        expect(form.current()).toBeNull();
    });
});

describe('the transport settings of a masque server', () => {
    it('shows the path alone and calls the client keys what they are', () => {
        const form = mountSettings({ path: '/p', host: 'h.example', user: 'u' }, { isClient: false });
        expect(form.path()).not.toBeNull();
        expect(form.host()).toBeNull();
        expect(form.$('[data-masque-warp]')).toBeNull();
        expect(form.text()).toContain('host, user');
        expect(form.text()).toContain('client-side fields on a server inbound');
    });
});

describe('a line that does not know the key', () => {
    it('says so instead of drawing fields, and removes it on request', () => {
        onLine('26.9');
        const form = mountSettings({ path: '/x' });
        expect(form.$('[data-masque-settings="unknown-line"]')).not.toBeNull();
        expect(form.path()).toBeNull();
        expect(form.text()).toContain('v26.9.9');
        fireEvent.click(form.$('[data-masque-settings="unknown-line"] button')!);
        expect(form.current()).toBeNull();
    });

    it('draws nothing at all when there is nothing to show', () => {
        onLine('26.7');
        const form = mountSettings(undefined);
        expect(form.$('[data-masque-settings]')).toBeNull();
    });
});

describe('the transport section of a masque proxy', () => {
    const mountSection = (stream: any, protocol: string, isClient: boolean) => {
        let latest: any = stream;
        const Harness = () => {
            const [value, setValue] = useState<any>(stream);
            latest = value;
            return <NetworkSection streamSettings={value} onChange={setValue} net={String(value.network)} isClient={isClient} protocol={protocol} />;
        };
        const view = render(<Harness />);
        return { ...view, current: () => JSON.parse(JSON.stringify(latest)) };
    };

    it('opens the masque settings under network masque', () => {
        const form = mountSection({ network: 'masque', security: 'tls' }, 'masque', true);
        expect(form.container.querySelector('[data-masque-settings]')).not.toBeNull();
        type(form.container.querySelector('input[placeholder="/.well-known/masque/ip/*/*/"]'), '/m/');
        expect(form.current().masqueSettings).toEqual({ path: '/m/' });
    });

    it('says what it does not draw for the other new transport, and keeps its settings', () => {
        const held = { network: 'xdrive', security: 'tls', xdriveSettings: { service: 'local', remoteFolder: '/tmp/x' } };
        const form = mountSection(held, 'vless', true);
        expect(form.container.querySelector('[data-xdrive-note]')).not.toBeNull();
        expect(form.container.querySelector('[data-masque-settings]')).toBeNull();
        expect(form.current()).toEqual(held);
    });

    it('removes the key from the stream settings when it is emptied', () => {
        const form = mountSection({ network: 'masque', security: 'tls', masqueSettings: { path: '/m/' } }, 'masque', false);
        type(form.container.querySelector('input[placeholder="/.well-known/masque/ip/*/*/"]'), '');
        expect('masqueSettings' in form.current()).toBe(false);
    });
});

describe('the outbound card', () => {
    const mountOutbound = (outbound: any) => {
        const Harness = () => {
            const [value, setValue] = useState<any>(outbound);
            return (
                <OutboundMasque
                    outbound={value}
                    onChange={(path: (string | number)[] | string, next: unknown) => {
                        const keys = Array.isArray(path) ? path : [path];
                        const copy = JSON.parse(JSON.stringify(value));
                        let node = copy;
                        keys.slice(0, -1).forEach(key => { node[key] = node[key] ?? {}; node = node[key]; });
                        node[keys[keys.length - 1]!] = next;
                        setValue(copy);
                    }}
                />
            );
        };
        return render(<Harness />);
    };

    it('is silent about what the factory builds', () => {
        const { container } = mountOutbound(createDefaultOutbound('masque'));
        expect(container.querySelectorAll('p.text-rose-400, p.text-rose-300')).toHaveLength(0);
    });

    it('says what the core says about a missing address and port, a hostname in remoteDNS, and Mux', () => {
        const { container } = mountOutbound({
            protocol: 'masque',
            settings: { remoteDNS: ['dns.example.com'] },
            mux: { enabled: true },
            streamSettings: { network: 'masque', security: 'tls' },
        });
        const text = container.textContent ?? '';
        expect(text).toContain('refuses a masque outbound without a server address');
        expect(text).toContain('refuses a masque outbound without a port');
        expect(text).toContain('dns.example.com');
        expect(text).toContain('cannot use Mux');
    });

    it('is silent on a line that does not register the protocol: the version table says it', () => {
        onLine('26.9');
        const { container } = mountOutbound({ protocol: 'masque', settings: {} });
        expect(container.textContent).not.toContain('refuses a masque outbound');
    });
});

describe('the server card', () => {
    const mountInbound = (inbound: any) => {
        let latest: any = inbound;
        const Harness = () => {
            const [value, setValue] = useState<any>(inbound);
            latest = value;
            return (
                <InboundMasque
                    inbound={value}
                    onChange={(path: (string | number)[] | string, next: unknown) => {
                        const keys = Array.isArray(path) ? path : [path];
                        const copy = JSON.parse(JSON.stringify(value));
                        let node = copy;
                        keys.slice(0, -1).forEach(key => { node[key] = node[key] ?? {}; node = node[key]; });
                        node[keys[keys.length - 1]!] = next;
                        setValue(copy);
                    }}
                />
            );
        };
        const view = render(<Harness />);
        return { ...view, current: () => JSON.parse(JSON.stringify(latest)) };
    };

    it('is silent about what the factory builds', () => {
        const { container } = mountInbound(createDefaultInbound('masque'));
        expect(container.querySelectorAll('p.text-rose-400, p.text-rose-300')).toHaveLength(0);
    });

    it('adds a user with a name and a password, and names the first mistake in one', () => {
        const form = mountInbound(createDefaultInbound('masque'));
        fireEvent.click(Array.from(form.container.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Add')!);
        const added = form.current().settings.clients;
        expect(added).toHaveLength(2);
        expect(added[1].email).toBe('user1@masque');
        expect(added[1].pass.length).toBeGreaterThan(8);

        const emails = form.container.querySelectorAll('input.input-base.py-1\\.5.text-xs:not(.font-mono)');
        type(emails[1]!, 'user@masque');
        expect(form.container.textContent).toContain('is used twice');
        type(emails[1]!, 'a:b@masque');
        expect(form.container.textContent).toContain('contains a colon');
    });

    it('writes the pool as a list of text and the MTU as a number', () => {
        const form = mountInbound(createDefaultInbound('masque'));
        type(form.container.querySelector('input[aria-label="Address pool"]'), '10.0.0.1/24, fd00::1/64');
        expect(form.current().settings.address).toEqual(['10.0.0.1/24', 'fd00::1/64']);
        type(form.container.querySelector('input[aria-label="Address pool"]'), '10.0.0.0/24');
        expect(form.container.textContent).toContain("network's own address");
    });
});
