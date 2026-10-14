import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { produce } from 'immer';
import { OutboundServer } from './OutboundServer';
import { useConfigStore } from '../../../store/configStore';
import { t } from '../../../i18n';

/**
 * The server card drew a "UUID / ID" box for every protocol and bound it for
 * four of them. For SOCKS, HTTP and hysteria it accepted typing and wrote
 * nothing, and the login a SOCKS or HTTP proxy actually takes had no field
 * anywhere — an authenticated proxy could only be set up in raw JSON.
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

describe.each(['socks', 'http'])('a %s outbound', protocol => {
    const listed = () => ({ protocol, settings: { servers: [{ address: 'p.example', port: 1080 }] } });

    it('has a user name and a password, and no UUID box', () => {
        mount(listed());
        expect(screen.getByText(t("Username"))).toBeDefined();
        expect(screen.getByText(t("Password"))).toBeDefined();
        expect(screen.queryByText(t("UUID / ID"))).toBeNull();
    });

    it('writes the login into servers[0].users[0], where the core reads it', () => {
        const { current } = mount(listed());
        fireEvent.change(field(t("Username")), { target: { value: 'alice' } });
        fireEvent.change(field(t("Password")), { target: { value: 's3cret' } });
        expect(current().settings.servers[0]).toEqual({
            address: 'p.example', port: 1080, users: [{ user: 'alice', pass: 's3cret' }],
        });
    });

    it('shows a login the config already has', () => {
        mount({ protocol, settings: { servers: [{ address: 'p', port: 1, users: [{ user: 'bob', pass: 'pw' }] }] } });
        expect(field(t("Username")).value).toBe('bob');
        expect(field(t("Password")).value).toBe('pw');
    });

    it('follows a flat config instead of writing a list nothing reads', () => {
        const { current } = mount({ protocol, settings: { address: 'p.example', port: 1080 } });
        fireEvent.change(field(t("Username")), { target: { value: 'alice' } });
        fireEvent.change(field(t("Address (IP or Domain)")), { target: { value: 'q.example' } });
        expect(current().settings).toEqual({ address: 'q.example', port: 1080, user: 'alice', pass: '' });
        expect(current().settings.servers).toBeUndefined();
    });

    it('removes the account when the login is cleared', () => {
        const { current } = mount({ protocol, settings: { servers: [{ address: 'p', port: 1, users: [{ user: 'a', pass: '' }] }] } });
        fireEvent.change(field(t("Username")), { target: { value: '' } });
        expect(current().settings.servers[0].users).toBeUndefined();
    });
});

describe('protocols with one identifier', () => {
    it('keeps the UUID box for vless, bound to users[0].id', () => {
        const { current } = mount({ protocol: 'vless', settings: { vnext: [{ address: 'a', port: 443, users: [{ id: '' }] }] } });
        fireEvent.change(field(t("UUID / ID")), { target: { value: 'abc' } });
        expect(current().settings.vnext[0].users[0].id).toBe('abc');
        expect(screen.queryByText(t("Username"))).toBeNull();
    });
});

describe('a hysteria outbound', () => {
    it('has no credential box here, and says where its password is', () => {
        mount({ protocol: 'hysteria', settings: { version: 2, address: 'h.example', port: 443 } });
        expect(screen.queryByText(t("UUID / ID"))).toBeNull();
        expect(screen.queryByText(t("Username"))).toBeNull();
        expect(screen.getByText(t("Hysteria's password is not set here: it is the transport's Auth, under Stream Settings below."))).toBeDefined();
    });
});

describe('the headers of an http outbound', () => {
    // settings.headers is a map[string]string on HTTPClientConfig, beside the
    // server whichever shape it is in (v26.7.28:infra/conf/http.go:66).
    const box = () => screen.getByLabelText(t("Headers")) as HTMLTextAreaElement;
    const listed = (extra: Record<string, unknown> = {}) => ({
        protocol: 'http', settings: { servers: [{ address: 'p.example', port: 8080 }], ...extra },
    });

    it('has a box, for an http outbound only', () => {
        mount(listed());
        expect(box()).toBeDefined();
        cleanup();
        mount({ protocol: 'socks', settings: { servers: [{ address: 'p.example', port: 1080 }] } });
        expect(screen.queryByLabelText(t("Headers"))).toBeNull();
    });

    it('writes the parsed object to settings.headers, not text', () => {
        const { current } = mount(listed());
        fireEvent.change(box(), { target: { value: '{ "User-Agent": "Mozilla/5.0" }' } });
        expect(current().settings.headers).toEqual({ 'User-Agent': 'Mozilla/5.0' });
        expect(current().settings.servers).toEqual([{ address: 'p.example', port: 8080 }]);
    });

    it('writes it beside a flat server too, where the core reads it just the same', () => {
        const { current } = mount({ protocol: 'http', settings: { address: 'p.example', port: 8080 } });
        fireEvent.change(box(), { target: { value: '{ "X-A": "b" }' } });
        expect(current().settings).toEqual({ address: 'p.example', port: 8080, headers: { 'X-A': 'b' } });
    });

    it('keeps the last good value while the JSON is unfinished, and removes the key when emptied', () => {
        const { current } = mount(listed({ headers: { 'X-A': 'b' } }));
        fireEvent.change(box(), { target: { value: '{ "X-A": ' } });
        expect(current().settings.headers).toEqual({ 'X-A': 'b' });
        fireEvent.change(box(), { target: { value: '' } });
        expect(current().settings.headers).toBeUndefined();
    });

    it('shows headers the config already has', () => {
        mount(listed({ headers: { 'X-A': 'b' } }));
        expect(JSON.parse(box().value)).toEqual({ 'X-A': 'b' });
    });

    it('refuses to write JSON that is not an object', () => {
        const { current } = mount(listed({ headers: { 'X-A': 'b' } }));
        fireEvent.change(box(), { target: { value: '["X-A"]' } });
        expect(current().settings.headers).toEqual({ 'X-A': 'b' });
    });

    it('shows a value of the wrong type for what it is, with a way out', () => {
        const { container, current } = mount(listed({ headers: 'User-Agent: x' }));
        const notice = container.querySelector('[data-wrong-type="headers"]') as HTMLElement;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain('User-Agent: x');
        // The box beside it starts empty: it is where the replacement goes.
        expect(box().value).toBe('');
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.headers).toBeUndefined();
        expect(container.querySelector('[data-wrong-type="headers"]')).toBeNull();
    });

    it('names a header whose value is not a string', () => {
        const { container } = mount(listed({ headers: { 'X-A': 'b', 'X-N': 5 } }));
        const problems = container.querySelectorAll('[data-problem="headers.value"]');
        expect(problems).toHaveLength(1);
        expect(problems[0]!.textContent).toContain('"X-N"');
    });
});
