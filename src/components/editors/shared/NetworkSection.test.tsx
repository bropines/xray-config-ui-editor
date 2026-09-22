import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { NetworkSection } from './NetworkSection';
import { TransportSettings } from './TransportSettings';

/**
 * Six transports, each with its own block of fields and none of them sharing
 * a field name. Nothing rendered any of these until now, which is how a form
 * could be wired to the wrong path — or to none — without a test noticing.
 */

afterEach(cleanup);

const noop = () => {};

/** The value each transport must show, proving it is bound to its own path. */
const CASES: [string, any, string][] = [
    // TCP's own value is a chooser, so the heading is what proves the block.
    ['tcp', { network: 'tcp', tcpSettings: { header: { type: 'http' } } }, 'TCP (RAW) Settings'],
    ['ws', { network: 'ws', wsSettings: { path: '/ws-probe' } }, '/ws-probe'],
    ['grpc', { network: 'grpc', grpcSettings: { serviceName: 'GunService' } }, 'GunService'],
    ['kcp', { network: 'kcp', kcpSettings: { seed: 'kcp-seed-value' } }, 'kcp-seed-value'],
    ['quic', { network: 'quic', quicSettings: { key: 'quic-key-value' } }, 'quic-key-value'],
    ['httpupgrade', { network: 'httpupgrade', httpupgradeSettings: { path: '/upgrade-probe' } }, '/upgrade-probe'],
];

const valuesIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('input')).map(i => (i as HTMLInputElement).value);

describe('NetworkSection', () => {
    for (const [net, streamSettings, expected] of CASES) {
        it(`shows the ${net} settings, bound to the ${net} path`, () => {
            const { container } = render(
                <NetworkSection streamSettings={streamSettings} onChange={noop} net={net} isClient={false} />,
            );
            const text = container.textContent ?? '';
            expect(valuesIn(container).includes(expected) || text.includes(expected)).toBe(true);
        });
    }

    it('shows one transport at a time, not all of them', () => {
        const { container } = render(
            <NetworkSection
                streamSettings={{ network: 'ws', wsSettings: { path: '/ws-probe' }, grpcSettings: { serviceName: 'GunService' } }}
                onChange={noop}
                net="ws"
                isClient={false}
            />,
        );
        expect(valuesIn(container)).toContain('/ws-probe');
        expect(valuesIn(container)).not.toContain('GunService');
    });

    it('writes back to the path the field belongs to', () => {
        let received: any = null;
        const { container } = render(
            <NetworkSection
                streamSettings={{ network: 'ws', wsSettings: { path: '/old' } }}
                onChange={next => { received = next; }}
                net="ws"
                isClient={false}
            />,
        );
        const input = Array.from(container.querySelectorAll('input'))
            .find(i => (i as HTMLInputElement).value === '/old') as HTMLInputElement;
        expect(input).toBeDefined();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(input, '/new');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(received?.wsSettings?.path).toBe('/new');
    });
});

describe('TransportSettings', () => {
    it('still draws the chosen transport through the section it delegates to', () => {
        const { container } = render(
            <TransportSettings
                streamSettings={{ network: 'grpc', grpcSettings: { serviceName: 'GunService' } }}
                onChange={noop}
                isClient={false}
            />,
        );
        expect(valuesIn(container)).toContain('GunService');
    });

    it('renders the security half for REALITY', () => {
        render(
            <TransportSettings
                streamSettings={{ network: 'tcp', security: 'reality', realitySettings: { serverNames: ['example.com'] } }}
                onChange={noop}
                isClient={false}
            />,
        );
        expect(screen.getAllByText(/REALITY/i).length).toBeGreaterThan(0);
    });
});
