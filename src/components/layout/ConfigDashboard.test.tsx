import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ConfigDashboard } from './ConfigDashboard';
import { useConfigStore } from '../../store/configStore';
import { __resetBackLayers } from '../../hooks/useBackToClose';

/**
 * The dashboard is the one screen that is always open, and the biggest file
 * here. These tests hold its four cards to what they show and what they call,
 * so the render can be broken up without anyone having to open the page to
 * find out what moved.
 */

const CONFIG = {
    inbounds: [
        { tag: 'socks-in', port: 10808, listen: '127.0.0.1', protocol: 'socks' },
        { tag: 'http-in', port: 10809, listen: '127.0.0.1', protocol: 'http' },
    ],
    outbounds: [
        { tag: 'proxy', protocol: 'vless', settings: {} },
        { tag: 'direct', protocol: 'freedom' },
        { tag: 'block', protocol: 'blackhole' },
    ],
    routing: {
        domainStrategy: 'IPIfNonMatch',
        rules: [
            { type: 'field', domain: ['geosite:ads'], outboundTag: 'block' },
            { type: 'field', ip: ['geoip:private'], outboundTag: 'direct' },
        ],
        balancers: [],
    },
    dns: { servers: ['1.1.1.1', '8.8.8.8'], queryStrategy: 'UseIP' },
} as any;

/** The shape the app hands down: each outbound with the index it came from. */
const withIndices = (outbounds: any[]) => outbounds.map((ob, originalIndex) => ({ ob, originalIndex }));

const noop = () => {};

const calls: Record<string, unknown[]> = {};
const spy = (name: string) => (...args: unknown[]) => { calls[name] = args; };

const mount = (overrides: Record<string, unknown> = {}) => render(
    <ConfigDashboard
        config={CONFIG}
        rawMode={false}
        setRawMode={noop}
        setConfig={noop}
        onEditInbound={spy('editInbound')}
        onDeleteInbound={noop}
        onOpenInboundJson={spy('inboundJson')}
        onAddInbound={spy('addInbound')}
        onEditRouting={spy('editRouting')}
        onOpenRoutingJson={noop}
        onEditOutbound={spy('editOutbound')}
        onDeleteOutbound={noop}
        onMoveOutbound={noop}
        onOpenOutboundJson={noop}
        onAddOutbound={spy('addOutbound')}
        onBatchImport={noop}
        onOpenWarpModal={noop}
        onEditDns={spy('editDns')}
        onOpenDnsJson={noop}
        filteredOutbounds={withIndices(CONFIG.outbounds)}
        obSearch=""
        setObSearch={noop}
        modulesVisible={false}
        setModulesVisible={noop}
        onOpenSettings={noop}
        onOpenReverse={noop}
        onOpenTopology={noop}
        onOpenGeoViewer={noop}
        onOpenConfigInspector={noop}
        {...overrides}
    />,
);

beforeAll(() => {
    useConfigStore.setState({ config: CONFIG, rawConfigText: JSON.stringify(CONFIG) } as any);
});

afterEach(() => {
    cleanup();
    __resetBackLayers();
    for (const key of Object.keys(calls)) delete calls[key];
});

describe('ConfigDashboard', () => {
    it('shows every inbound it was given, by tag and port', () => {
        mount();
        expect(screen.getByText('socks-in')).toBeDefined();
        expect(screen.getByText('http-in')).toBeDefined();
        expect(screen.getByText(/10808/)).toBeDefined();
    });

    it('counts the inbounds in the card heading', () => {
        mount();
        expect(screen.getByText(/Inbounds \(2\)|Inbounds\s*\(2\)/)).toBeDefined();
    });

    it('shows the routing strategy and every rule', () => {
        mount();
        expect(screen.getByText('IPIfNonMatch')).toBeDefined();
        expect(screen.getAllByText('block').length).toBeGreaterThan(0);
        expect(screen.getAllByText('direct').length).toBeGreaterThan(0);
    });

    it('shows every outbound it was given', () => {
        mount();
        for (const tag of ['proxy', 'direct', 'block']) {
            expect(screen.getAllByText(tag).length).toBeGreaterThan(0);
        }
    });

    it('shows the DNS upstreams', () => {
        mount();
        expect(screen.getByText(/1\.1\.1\.1/)).toBeDefined();
    });

    it('opens the editor for the inbound whose pencil was clicked', () => {
        mount();
        // The row itself is not a target; each has its own Edit button.
        const edits = screen.getAllByTitle(/^(Edit|Изменить)$/);
        fireEvent.click(edits[1]!);
        expect(calls['editInbound']?.[1]).toBe(1);
        expect((calls['editInbound']?.[0] as any).tag).toBe('http-in');
    });

    it('opens the editor for the outbound that was clicked', () => {
        mount();
        fireEvent.click(screen.getAllByText('block').at(-1)!);
        expect(calls['editOutbound']).toBeDefined();
    });

    it('asks to edit routing, DNS and to add, from the card headers', () => {
        mount();
        fireEvent.click(screen.getByTitle(/Edit Routing|Изменить маршрутизацию/));
        expect(calls['editRouting']).toBeDefined();

        fireEvent.click(screen.getByTitle(/Edit DNS|Изменить DNS/));
        expect(calls['editDns']).toBeDefined();

        fireEvent.click(screen.getByTitle(/Add Inbound|Добавить inbound/));
        expect(calls['addInbound']).toBeDefined();
    });

    it('renders an empty config without falling over', () => {
        mount({ config: { inbounds: [], outbounds: [], routing: { rules: [] } }, filteredOutbounds: [] });
        expect(screen.getByText(/Inbounds \(0\)|Inbounds\s*\(0\)/)).toBeDefined();
    });

    it('renders on a phone, where the cards stack', () => {
        globalThis.setViewportWidth(400);
        try {
            mount();
            expect(screen.getByText('socks-in')).toBeDefined();
        } finally {
            globalThis.setViewportWidth(1280);
        }
    });
});
