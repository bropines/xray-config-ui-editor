import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { produce } from 'immer';
import { OutboundServer } from './OutboundServer';
import { useConfigStore } from '../../../store/configStore';
import { t } from '../../../i18n';

/**
 * The Shadowsocks half of the server card. It drew `servers[0]` whatever shape
 * the config was in, a cipher the config did not hold, a UDP-over-TCP switch
 * for every cipher on a line that only gives it to the 2022 ones, and a
 * protocol name no loader knows as a kind of Shadowsocks.
 */

beforeEach(() => {
    act(() => {
        useConfigStore.setState({ coreVersion: '26.7' });
    });
});
afterEach(cleanup);

/** Renders the card and applies its writes the way the editor's updateField does. */
const mount = (initial: any) => {
    let outbound = initial;
    const view = render(<OutboundServer outbound={outbound} onChange={() => {}} />);
    const draw = () => view.rerender(
        <OutboundServer
            outbound={outbound}
            onChange={(path: string | (string | number)[], value: any) => {
                outbound = produce(outbound, (draft: any) => {
                    const keys = Array.isArray(path) ? path : [path];
                    let at = draft;
                    keys.slice(0, -1).forEach((key, i) => {
                        if (!at[key] || typeof at[key] !== 'object') at[key] = typeof keys[i + 1] === 'number' ? [] : {};
                        at = at[key];
                    });
                    at[keys[keys.length - 1]!] = value;
                });
                draw();
            }}
        />,
    );
    draw();
    return { ...view, current: () => outbound };
};

/** The input of the FormField carrying this label: the label sits two rows above its field's root. */
const field = (label: string) =>
    screen.getByText(label).closest('.flex-col')!.querySelector('input') as HTMLInputElement;

const SERVER = { address: 'ss.example', port: 8388, method: 'aes-256-gcm', password: 'pw' };
const KEY16 = Buffer.alloc(16, 7).toString('base64');
const AES128 = '2022-blake3-aes-128-gcm';
const listed = (extra: Record<string, unknown> = {}) => ({ protocol: 'shadowsocks', settings: { servers: [{ ...SERVER, ...extra }] } });
const onLine = (version: '26.3' | '26.7' | '26.9' | '26.10') => act(() => { useConfigStore.setState({ coreVersion: version }); });
const problem = (container: HTMLElement, kind: string) => container.querySelector(`[data-problem="${kind}"]`);

describe('the shapes', () => {
    it('follows a flat config instead of writing a list nothing reads', () => {
        // Build() replaces `servers` with the flat fields whenever `address` is there
        // (v26.7.28:infra/conf/shadowsocks.go:201-212).
        const { current } = mount({ protocol: 'shadowsocks', settings: { ...SERVER } });
        expect(field(t("Address (IP or Domain)")).value).toBe('ss.example');
        expect(field(t("Password")).value).toBe('pw');
        fireEvent.change(field(t("Password")), { target: { value: 'other' } });
        fireEvent.change(field(t("Address (IP or Domain)")), { target: { value: 'q.example' } });
        expect(current().settings).toEqual({ address: 'q.example', port: 8388, method: 'aes-256-gcm', password: 'other' });
        expect(current().settings.servers).toBeUndefined();
    });

    it('writes servers[0] for a list, as before', () => {
        const { current } = mount(listed());
        fireEvent.change(field(t("Password")), { target: { value: 'other' } });
        expect(current().settings.servers[0]).toEqual({ ...SERVER, password: 'other' });
    });

    it('says what is wrong with a server nothing can be read from', () => {
        const { container } = render(<OutboundServer outbound={{ protocol: 'shadowsocks', settings: { servers: [] } }} onChange={() => {}} />);
        expect(problem(container, 'servers.count')).not.toBeNull();
    });
});

describe('the cipher', () => {
    it('shows an empty method as empty rather than as a default the config does not hold', () => {
        const { container, rerender } = render(<OutboundServer outbound={listed({ method: undefined })} onChange={() => {}} />);
        // aes-256-gcm is what the card used to draw here, and the config has no such thing.
        expect(screen.queryByText('aes-256-gcm')).toBeNull();
        expect(screen.getByText(t("Choose a method"))).toBeDefined();
        // An outbound has no default cipher, so the empty method is said to be refused.
        expect(problem(container, 'method.empty')).not.toBeNull();
        rerender(<OutboundServer outbound={listed()} onChange={() => {}} />);
        expect(screen.getByText('aes-256-gcm')).toBeDefined();
        expect(problem(container, 'method.empty')).toBeNull();
    });

    it('shows a method the line refuses, and says so', () => {
        const { container } = render(<OutboundServer outbound={listed({ method: 'rc4-md5' })} onChange={() => {}} />);
        expect(screen.getByText('rc4-md5')).toBeDefined();
        expect(problem(container, 'method.unknown')!.textContent).toContain('"rc4-md5"');
    });

    it('says what is wrong with a 2022 key beside the password', () => {
        const { container } = render(<OutboundServer outbound={listed({ method: AES128, password: 'not base64!' })} onChange={() => {}} />);
        expect(problem(container, 'key.base64')).not.toBeNull();
        cleanup();
        const ok = render(<OutboundServer outbound={listed({ method: AES128, password: KEY16 })} onChange={() => {}} />);
        expect(ok.container.querySelector('[data-problem]')).toBeNull();
    });
});

describe('UDP over TCP', () => {
    const uot = () => screen.queryByText(t("UDP over TCP (UOT)"));

    it('is offered on 26.3 beside a 2022 cipher, where it does something', () => {
        onLine('26.3');
        const { current } = mount(listed({ method: AES128, password: KEY16 }));
        expect(uot()).not.toBeNull();
        fireEvent.click(uot()!);
        expect(current().settings.servers[0].uot).toBe(true);
    });

    it('is offered nowhere else: not beside a classic cipher, and not on a line without the key', () => {
        onLine('26.3');
        const classic = render(<OutboundServer outbound={listed()} onChange={() => {}} />);
        expect(uot()).toBeNull();
        classic.unmount();
        for (const line of ['26.7', '26.9', '26.10'] as const) {
            onLine(line);
            const view = render(<OutboundServer outbound={listed({ method: AES128, password: KEY16 })} onChange={() => {}} />);
            expect(uot()).toBeNull();
            view.unmount();
        }
    });

    it('is drawn, with what the line does with it and a way out, on a line without the key', () => {
        onLine('26.7');
        const { container, current } = mount(listed({ uot: true, uotVersion: 2 }));
        expect(uot()).toBeNull();
        const notice = container.querySelector('[data-held-uot]') as HTMLElement;
        expect(notice.getAttribute('data-held-uot')).toBe('uot,uotVersion');
        expect(notice.textContent).toContain('uot, uotVersion');
        expect(notice.textContent).toContain('does nothing');
        fireEvent.click(screen.getByText(t("Remove")));
        expect(current().settings.servers[0]).toEqual(SERVER);
        expect(container.querySelector('[data-held-uot]')).toBeNull();
    });

    it('is drawn beside a classic cipher on 26.3, where the key is read and thrown away', () => {
        onLine('26.3');
        const { container, current } = mount(listed({ uot: true }));
        expect(uot()).toBeNull();
        expect((container.querySelector('[data-held-uot]') as HTMLElement).textContent).toContain('2022');
        fireEvent.click(screen.getByText(t("Remove")));
        expect(current().settings.servers[0]).toEqual(SERVER);
    });

    it('is removed from the flat settings when that is where the core reads it', () => {
        onLine('26.10');
        const { current } = mount({ protocol: 'shadowsocks', settings: { ...SERVER, uot: true } });
        fireEvent.click(screen.getByText(t("Remove")));
        expect(current().settings).toEqual(SERVER);
    });

    it('shows the version of a switch the line reads, as the number the core decodes', () => {
        onLine('26.3');
        const { current } = mount(listed({ method: AES128, password: KEY16, uot: true, uotVersion: 2 }));
        const box = screen.getByText(t("UDP over TCP version")).querySelector('input') as HTMLInputElement;
        expect(box.value).toBe('2');
        fireEvent.change(box, { target: { value: '1' } });
        expect(current().settings.servers[0].uotVersion).toBe(1);
    });
});

describe('the protocol name', () => {
    it('says shadowsocks-2022 is no protocol, and renames it in place with the settings kept', () => {
        const { container, current } = mount({ ...listed(), protocol: 'shadowsocks-2022' });
        expect(problem(container, 'protocol.name')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Use shadowsocks")));
        expect(current().protocol).toBe('shadowsocks');
        expect(current().settings.servers[0]).toEqual(SERVER);
        expect(container.querySelector('[data-problem="protocol.name"]')).toBeNull();
    });

    it('says nothing about shadowsocks itself', () => {
        const { container } = render(<OutboundServer outbound={listed()} onChange={() => {}} />);
        expect(container.querySelector('[data-problem]')).toBeNull();
        expect(screen.queryByText(t("Use shadowsocks"))).toBeNull();
    });
});
