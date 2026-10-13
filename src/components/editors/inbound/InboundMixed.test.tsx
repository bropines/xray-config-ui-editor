import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { InboundModal } from '../InboundModal';
import { InboundGeneral } from './InboundGeneral';
import { InboundClients } from './InboundClients';
import { useInboundEditor } from '../../../hooks/useInboundEditor';
import { useConfigStore } from '../../../store/configStore';
import { __resetBackLayers } from '../../../hooks/useBackToClose';
import { createDefaultInbound } from '../../../core/generators/endpoint-factory';
import { CORE_VERSIONS, type CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * `mixed` is an inbound protocol on every supported core — the socks server
 * under another name (v26.7.28:infra/conf/xray.go:27-28) — and the editor did
 * not know the word: it was not in the chooser, so it could not be created,
 * and an inbound that already was one opened with the chooser blank and no
 * settings card under it.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

const CONFIG = {
    inbounds: [{ tag: 'mixed-in', port: 2080, listen: '127.0.0.1', protocol: 'mixed', settings: { auth: 'password', accounts: [{ user: 'alice', pass: 'secret' }], udp: true } }],
    outbounds: [{ tag: 'direct', protocol: 'freedom' }],
} as any;

beforeAll(() => {
    useConfigStore.setState({ config: CONFIG, rawConfigText: JSON.stringify(CONFIG, null, 2) } as any);
});

beforeEach(() => onLine('26.7'));
afterEach(() => {
    cleanup();
    __resetBackLayers();
});

/** The chooser and the settings card over the editor's own state, as the modal wires them. */
const mount = (data: any) => {
    const seen: any[] = [];
    const Harness = () => {
        const { local, updateField, handleProtocolChange } = useInboundEditor(data, () => {});
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return (
            <>
                <InboundGeneral inbound={local} onChange={updateField} onProtocolChange={handleProtocolChange} />
                <InboundClients inbound={local} onChange={updateField} />
            </>
        );
    };
    const view = render(<Harness />);
    return { ...view, current: () => JSON.parse(JSON.stringify(seen[seen.length - 1])) };
};

/** The chooser is a button showing the chosen protocol; its list opens in a portal. */
const chooser = (shown: string) => screen.getByText(shown).closest('button') as HTMLButtonElement;
const valuesIn = (container: HTMLElement) => Array.from(container.querySelectorAll('input')).map(input => input.value);
const SETTINGS_HEADING = () => t("{protocol} settings", { protocol: 'MIXED' });

describe('choosing mixed', () => {
    it.each(CORE_VERSIONS.map(line => line.id))('is offered on %s, which registers it', line => {
        onLine(line);
        mount(createDefaultInbound('vless'));
        fireEvent.click(chooser('vless'));
        expect(screen.getByText('mixed')).toBeDefined();
    });

    it('makes a mixed inbound with the socks settings, and draws its card', () => {
        const { current } = mount(createDefaultInbound('vless'));
        expect(screen.queryByText(SETTINGS_HEADING())).toBeNull();

        fireEvent.click(chooser('vless'));
        fireEvent.click(screen.getByText('mixed'));

        expect(current().protocol).toBe('mixed');
        expect(current().settings).toEqual({ auth: 'noauth', udp: true });
        // Chosen, and shown as chosen.
        expect(chooser('mixed')).toBeDefined();
        expect(screen.getByText(SETTINGS_HEADING())).toBeDefined();
        expect(screen.getByText(t("Auth Type"))).toBeDefined();
        expect(screen.getByText(t("UDP Support"))).toBeDefined();
    });
});

describe('an existing mixed inbound', () => {
    it.each(CORE_VERSIONS.map(line => line.id))('opens with its protocol selected and its settings shown, on %s', line => {
        onLine(line);
        const { container } = render(<InboundModal data={CONFIG.inbounds[0]} onSave={() => {}} onClose={() => {}} />);
        const body = container.ownerDocument.body;
        // The chooser shows the protocol rather than its placeholder...
        expect(chooser('mixed')).toBeDefined();
        expect(body.textContent).not.toContain('Select option...');
        // ...and the card under it is the socks one, with this inbound's values in it.
        expect(screen.getByText(SETTINGS_HEADING())).toBeDefined();
        expect(screen.getByText(t("{protocol} accounts", { protocol: 'MIXED' }))).toBeDefined();
        expect(valuesIn(body)).toContain('alice');
        expect(valuesIn(body)).toContain('secret');
        // Nothing about it is refused or ignored by this line.
        expect(body.textContent).not.toContain(t("Checked against Xray {tag}", { tag: CORE_VERSIONS.find(v => v.id === line)!.tag }));
    });

    it('writes its settings where a socks inbound writes them', () => {
        const { current, container } = mount({ tag: 'mixed-in', port: 2080, protocol: 'mixed', settings: { auth: 'noauth', udp: true } });

        // UDP is the only checkbox on the card.
        fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
        expect(current().settings.udp).toBe(false);

        fireEvent.click(chooser(t("No Auth")));
        fireEvent.click(screen.getByText(t("Password")));
        expect(current().settings.auth).toBe('password');

        // `accounts` is the spelling every line reads; `users` is 26.7's alias.
        fireEvent.click(screen.getByText(t("Add Account")));
        expect(current().settings.accounts).toHaveLength(1);
        expect(current().settings.users).toBeUndefined();
        expect(current().protocol).toBe('mixed');
    });

    it('has a lone 26.7 `users` list moved onto `accounts`, as socks does', () => {
        const { current, container } = mount({ tag: 'mixed-in', port: 2080, protocol: 'mixed', settings: { auth: 'password', users: [{ user: 'bob', pass: 'pw' }] } });
        expect(current().settings).toEqual({ auth: 'password', accounts: [{ user: 'bob', pass: 'pw' }] });
        expect(valuesIn(container)).toContain('bob');
    });
});

describe('a protocol the editor has never heard of', () => {
    it('is still shown as what the inbound is, rather than as nothing', () => {
        mount({ tag: 'x', port: 1, protocol: 'something-new', settings: {} });
        expect(chooser('something-new')).toBeDefined();
    });
});
