import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { useConfigStore } from '../../store/configStore';
import { __resetBackLayers } from '../../hooks/useBackToClose';
import { t } from '../../i18n';

import { InboundModal } from './InboundModal';
import { OutboundModal } from './OutboundModal';
import { RoutingModal } from './RoutingModal';
import { DnsModal } from './DnsModal';
import { ReverseModal } from './ReverseModal';
import { SettingsModal } from './SettingsModal';
import { GeoViewerModal } from './GeoViewerModal';
import { ConfigInspectorModal } from './ConfigInspectorModal';
import { HostsModal } from './hosts/HostsModal';
import { SnippetsModal } from './snippets/SnippetsModal';

/**
 * Does each editor still open?
 *
 * Not a test of what they do — a test that they mount at all. The project
 * builds with esbuild, which does not run anything, so a bad import, a hook
 * called conditionally, or a prop read off an undefined object surfaces only
 * when someone opens that screen. Two of those shipped this year.
 */

const CONFIG = {
    log: { loglevel: 'warning' },
    inbounds: [{ tag: 'socks-in', port: 10808, listen: '127.0.0.1', protocol: 'socks', settings: { auth: 'noauth', udp: true } }],
    outbounds: [{ tag: 'proxy', protocol: 'vless', settings: {} }, { tag: 'direct', protocol: 'freedom' }],
    routing: { domainStrategy: 'IPIfNonMatch', rules: [{ type: 'field', domain: ['geosite:ads'], outboundTag: 'block' }], balancers: [] },
    dns: { servers: ['1.1.1.1'], queryStrategy: 'UseIP' },
    reverse: { bridges: [{ tag: 'bridge', domain: 'example.com' }], portals: [] },
} as any;

beforeAll(() => {
    useConfigStore.setState({ config: CONFIG, rawConfigText: JSON.stringify(CONFIG, null, 2) } as any);
});

afterEach(() => {
    cleanup();
    __resetBackLayers();
});

/** Each editor, and the text that proves it got as far as drawing itself. */
const EDITORS: [string, () => React.ReactElement][] = [
    ['inbound', () => <InboundModal data={CONFIG.inbounds[0]} onSave={() => {}} onClose={() => {}} />],
    ['outbound', () => <OutboundModal data={CONFIG.outbounds[0]} index={0} onSave={() => {}} onClose={() => {}} />],
    ['routing', () => <RoutingModal onClose={() => {}} />],
    ['dns', () => <DnsModal onClose={() => {}} />],
    ['reverse', () => <ReverseModal onClose={() => {}} />],
    ['core settings', () => <SettingsModal onClose={() => {}} />],
    ['geo viewer', () => <GeoViewerModal onClose={() => {}} />],
    ['config inspector', () => <ConfigInspectorModal onClose={() => {}} setModal={() => {}} openSectionJson={() => {}} />],
    ['hosts', () => <HostsModal onClose={() => {}} />],
    ['snippets', () => <SnippetsModal onClose={() => {}} />],
];

describe('every editor opens', () => {
    for (const [name, mount] of EDITORS) {
        it(`${name} mounts and offers a way out`, () => {
            const { container } = render(mount());
            // Something rendered...
            expect(container.ownerDocument.body.textContent!.length).toBeGreaterThan(0);
            // ...and it is a sheet, with the one way out a sheet always has.
            const ways = screen.queryAllByText(t("Close"));
            const corner = container.ownerDocument.querySelectorAll('svg').length;
            expect(ways.length + corner).toBeGreaterThan(0);
        });
    }

    it('renders each editor on a phone too, where the layout differs', () => {
        globalThis.setViewportWidth(400);
        try {
            for (const [, mount] of EDITORS) {
                const { unmount } = render(mount());
                unmount();
            }
        } finally {
            globalThis.setViewportWidth(1280);
        }
    });
});
