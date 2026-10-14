import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { InboundClients } from './InboundClients';
import { t } from '../../../i18n';

/**
 * The Shadowsocks card drew `aes-256-gcm` (or a 2022 name, for the app's own
 * `shadowsocks-2022`) whenever the config had no `method`, so a form showing a
 * cipher sat over a config that held none — and the diagnostics then spoke of
 * a method the form seemed to have.
 */

afterEach(cleanup);

const ss = (settings: Record<string, unknown>, protocol = 'shadowsocks') => ({ protocol, port: 8388, settings });

describe('the Shadowsocks card', () => {
    it('shows the method the config holds', () => {
        render(<InboundClients inbound={ss({ method: 'aes-128-gcm', password: 'p' })} onChange={() => {}} />);
        expect(screen.getByText('aes-128-gcm')).toBeDefined();
        expect(screen.queryByText(t("Choose a method"))).toBeNull();
    });

    it('shows no method where the config has none, instead of a default it does not hold', () => {
        render(<InboundClients inbound={ss({ password: 'p' })} onChange={() => {}} />);
        expect(screen.queryByText('aes-256-gcm')).toBeNull();
        expect(screen.getByText(t("Choose a method"))).toBeDefined();
    });

    it('does the same for an empty method, and for the 2022 spelling of the protocol', () => {
        for (const protocol of ['shadowsocks', 'shadowsocks-2022']) {
            render(<InboundClients inbound={ss({ method: '', password: 'p' }, protocol)} onChange={() => {}} />);
            expect(screen.queryByText('aes-256-gcm')).toBeNull();
            expect(screen.queryByText('2022-blake3-aes-128-gcm')).toBeNull();
            expect(screen.getByText(t("Choose a method"))).toBeDefined();
            cleanup();
        }
    });

    it('writes the method that is picked', () => {
        const calls: [unknown, unknown][] = [];
        render(<InboundClients inbound={ss({ password: 'p' })} onChange={(path: unknown, value: unknown) => calls.push([path, value])} />);
        fireEvent.click(screen.getByText(t("Choose a method")));
        fireEvent.click(screen.getByText('chacha20-ietf-poly1305'));
        expect(calls).toEqual([[['settings', 'method'], 'chacha20-ietf-poly1305']]);
    });

    it('lists the 2022 names and the classic ones for the one protocol that exists', () => {
        for (const protocol of ['shadowsocks', 'shadowsocks-2022']) {
            render(<InboundClients inbound={ss({ password: 'p' }, protocol)} onChange={() => {}} />);
            fireEvent.click(screen.getByText(t("Choose a method")));
            expect(screen.getAllByText('2022-blake3-aes-256-gcm').length).toBeGreaterThan(0);
            expect(screen.getAllByText('aes-256-gcm').length).toBeGreaterThan(0);
            cleanup();
        }
    });
});
