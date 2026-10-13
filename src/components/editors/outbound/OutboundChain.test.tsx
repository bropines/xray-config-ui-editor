import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { OutboundChain } from './OutboundChain';
import { OutboundProxyMux } from './OutboundProxyMux';
import { useConfigStore } from '../../../store/configStore';
import { chainOf } from '../../../core/xray/outbound-chain';
import { outboundShape } from '../../../core/xray/outbound-shape';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * The chain chooser was in this card, was replaced by a sentence pointing at
 * Sockopt in 1.22.0, and stayed gone for six releases — on the belief that
 * the core no longer took `proxySettings`, which was read off the development
 * branch and is true of one supported line out of three. These tests are here
 * so that it takes a failing test, not a user, to notice if it goes again.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

/**
 * Renders the card over an outbound and applies what it writes, the way the
 * editor's `updateField` does — so a second press sees the first one's result.
 */
const mount = (initial: any, tags = ['warp', 'obfs']) => {
    let outbound = initial;
    const view = render(<OutboundChain outbound={outbound} onChange={() => {}} outboundTags={tags} />);
    const draw = () => view.rerender(
        <OutboundChain
            outbound={outbound}
            outboundTags={tags}
            onChange={(path, value) => {
                outbound = { ...outbound, [path]: value };
                draw();
            }}
        />,
    );
    draw();
    return { ...view, current: () => outbound };
};

const plain = { tag: 'proxy', protocol: 'vless', streamSettings: { network: 'ws', security: 'tls' } };
const layerButtons = () => screen.queryAllByRole('radio').map(button => button.textContent);

describe('choosing what to go through', () => {
    it('offers every other outbound right in the card', () => {
        mount(plain);
        expect(screen.getByText('warp')).toBeDefined();
        expect(screen.getByText('obfs')).toBeDefined();
    });

    it('chains at the transport layer on a press, as sockopt.dialerProxy', () => {
        const { current } = mount(plain);
        fireEvent.click(screen.getByText('warp'));
        expect(current().streamSettings.sockopt).toEqual({ dialerProxy: 'warp' });
        expect(current().proxySettings).toBeUndefined();
        // The transport it already had is left alone.
        expect(current().streamSettings.network).toBe('ws');
    });

    it('unchains', () => {
        const { current } = mount({ ...plain, streamSettings: { sockopt: { dialerProxy: 'warp' } } });
        fireEvent.click(screen.getByText(t("Unchain")));
        expect(chainOf(current())).toBeNull();
    });
});

describe('choosing the layer', () => {
    it('offers both layers where the core runs both', () => {
        onLine('26.7');
        mount({ ...plain, streamSettings: { sockopt: { dialerProxy: 'warp' } } });
        expect(layerButtons()).toEqual([t("L4 · Transport"), t("L7 · Application")]);
    });

    it('moves between them, clearing the key it leaves', () => {
        const { current } = mount({ ...plain, streamSettings: { sockopt: { dialerProxy: 'warp' } } });
        fireEvent.click(screen.getByText(t("L7 · Application")));
        expect(current().proxySettings).toEqual({ tag: 'warp' });
        expect(chainOf(current())).toMatchObject({ layer: 'L7', conflict: false });

        fireEvent.click(screen.getByText(t("L4 · Transport")));
        expect(current().proxySettings).toBeUndefined();
        expect(chainOf(current())).toMatchObject({ layer: 'L4', field: 'sockopt.dialerProxy' });
    });

    it('does not offer the application layer on a line that refuses it', () => {
        onLine('26.9');
        mount({ ...plain, streamSettings: { sockopt: { dialerProxy: 'warp' } } });
        expect(layerButtons()).toEqual([t("L4 · Transport")]);
    });

    it('still shows an application-layer chain the config has, and the way out', () => {
        onLine('26.9');
        const { current, container } = mount({ ...plain, proxySettings: { tag: 'warp' } });
        // Shown, not hidden: the config holds it whether the line likes it or not.
        expect(layerButtons()).toContain(t("L7 · Application"));
        expect(container.querySelector('[data-tone="critical"]')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Switch to the transport layer")));
        expect(chainOf(current())).toMatchObject({ layer: 'L4', field: 'sockopt.dialerProxy' });
    });
});

describe('saying what a chain does', () => {
    it('names the stream settings an application-layer chain leaves unused', () => {
        const { container } = mount({
            ...plain,
            streamSettings: { network: 'xhttp', security: 'reality' },
            proxySettings: { tag: 'warp' },
        });
        const warning = container.querySelector('[data-tone="warning"]');
        expect(warning?.textContent).toContain('network: xhttp');
        expect(warning?.textContent).toContain('security: reality');
    });

    it('reads the old transportLayer spelling as the transport layer it is', () => {
        const { current } = mount({ ...plain, proxySettings: { tag: 'warp', transportLayer: true } });
        expect(screen.getByRole('radio', { checked: true }).textContent).toBe(t("L4 · Transport"));
        fireEvent.click(screen.getByText(t("Rewrite as sockopt.dialerProxy")));
        expect(current().proxySettings).toBeUndefined();
        expect(current().streamSettings.sockopt.dialerProxy).toBe('warp');
    });

    it('flags both keys set at once, which the core refuses', () => {
        const { container } = mount({
            ...plain,
            proxySettings: { tag: 'warp' },
            streamSettings: { sockopt: { dialerProxy: 'obfs' } },
        });
        expect(container.querySelector('[data-tone="critical"]')).not.toBeNull();
    });
});

describe('the block the card sits in', () => {
    const block = (outbound: any) => {
        const shape = outboundShape(outbound.protocol);
        return render(
            <OutboundProxyMux
                outbound={outbound}
                onChange={() => {}}
                showChain={shape.transport}
                showMux={shape.mux || outbound.mux !== undefined}
                showStrategy={shape.strategy}
                muxOffered={shape.mux}
                outboundTags={['warp']}
            />,
        );
    };

    it.each(['socks', 'http', 'hysteria'])('offers mux to %s, which an Xray far end answers', protocol => {
        block({ tag: 'p', protocol });
        expect(screen.getByText(t("Mux (Multiplexing)"))).toBeDefined();
    });

    it('does not offer mux to an outbound that cannot carry it', () => {
        block({ tag: 'p', protocol: 'freedom' });
        expect(screen.queryByText(t("Mux (Multiplexing)"))).toBeNull();
    });

    it('still shows a mux the config has, so it can be switched off', () => {
        block({ tag: 'p', protocol: 'freedom', mux: { enabled: true } });
        expect(screen.getByText(t("Mux (Multiplexing)"))).toBeDefined();
    });
});
