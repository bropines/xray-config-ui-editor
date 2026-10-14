import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { InboundTun } from './InboundTun';
import { useInboundEditor } from '../../../hooks/useInboundEditor';
import { useConfigStore } from '../../../store/configStore';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * `autoOutboundsInterface` could be given a value and never switched off: the
 * form removed the key when its box was emptied, and an absent key means
 * "auto" as soon as routes are listed (v26.7.28:infra/conf/tun.go:38-40).
 * Only `""` is off (:35-37). These draw the card over the editor's real state
 * and read back what lands in the config.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.7'));
afterEach(cleanup);

const mount = (settings: Record<string, unknown>) => {
    const seen: any[] = [];
    const Harness = () => {
        const { local, updateField } = useInboundEditor({ tag: 'tun-in', protocol: 'tun', settings } as any, () => {});
        useEffect(() => {
            seen.push(local);
        }, [local]);
        return <InboundTun inbound={local} onChange={updateField} />;
    };
    const view = render(<Harness />);
    const card = () => view.container.querySelector('[data-tun-outbounds-interface]') as HTMLElement | null;
    return {
        ...view,
        card,
        /** The settings as they would be saved: `undefined` gone, `""` kept, as in the JSON. */
        saved: () => JSON.parse(JSON.stringify(seen[seen.length - 1])).settings,
        box: () => card()!.querySelector('input') as HTMLInputElement,
        pill: (label: string) => Array.from(card()!.querySelectorAll('button')).find(button => button.textContent === label) as HTMLButtonElement,
        effect: () => card()!.querySelector('[data-tun-effect]')?.textContent ?? null,
    };
};

describe('the outbounds interface of a tun inbound', () => {
    it('can be switched off, and the config says so with an empty string', () => {
        const view = mount({ autoSystemRoutingTable: ['0.0.0.0/0'] });
        // Nothing written, routes listed: the core uses "auto".
        expect(view.card()!.getAttribute('data-tun-outbounds-interface')).toBe('unset');
        expect(view.effect()).toContain('Xray uses "auto"');

        fireEvent.click(view.pill(t("Off")));
        expect(view.saved().autoOutboundsInterface).toBe('');
        expect('autoOutboundsInterface' in view.saved()).toBe(true);
        expect(view.card()!.getAttribute('data-tun-outbounds-interface')).toBe('off');
        expect(view.effect()).toContain('not bound to an interface');
        // Switching off keeps what else was set.
        expect(view.saved().autoSystemRoutingTable).toEqual(['0.0.0.0/0']);
    });

    it('is not "off" when nothing is written and no routes are listed — but it says what that amounts to', () => {
        const view = mount({ name: 'xray0' });
        expect(view.effect()).toContain('does not bind');
        // Not set is a state of its own, apart from off.
        expect(view.pill(t("Not set")).className).toContain('bg-indigo-600');
        expect(view.pill(t("Off")).className).not.toContain('bg-indigo-600');
    });

    it('goes back to the default by removing the key, not by writing an empty one', () => {
        const view = mount({ autoSystemRoutingTable: ['0.0.0.0/0'], autoOutboundsInterface: '' });
        expect(view.card()!.getAttribute('data-tun-outbounds-interface')).toBe('off');
        fireEvent.click(view.pill(t("Not set")));
        expect('autoOutboundsInterface' in view.saved()).toBe(false);
        expect(view.effect()).toContain('Xray uses "auto"');
    });

    it('writes "auto" for Automatic and a name for a typed interface', () => {
        const view = mount({});
        fireEvent.click(view.pill(t("Automatic")));
        expect(view.saved().autoOutboundsInterface).toBe('auto');
        expect(view.effect()).toContain('never the TUN');

        fireEvent.change(view.box(), { target: { value: 'eth0' } });
        expect(view.saved().autoOutboundsInterface).toBe('eth0');
        expect(view.effect()).toContain('eth0');
        // A name is none of the three buttons.
        expect(view.card()!.querySelectorAll('button.bg-indigo-600').length).toBe(0);
    });

    it('treats a name cleared by hand as not set, never as off', () => {
        const view = mount({ autoOutboundsInterface: 'eth0', autoSystemRoutingTable: ['10.0.0.0/8'] });
        expect(view.box().value).toBe('eth0');
        fireEvent.change(view.box(), { target: { value: '' } });
        expect('autoOutboundsInterface' in view.saved()).toBe(false);
    });

    it('shows a value of the wrong type as it is, with a way out, and writes text over it', () => {
        // Drawn straight from a held value: the editor hook turns an old boolean into text
        // (endpoint-factory's normalizeInbound) before the card ever sees it, but a value
        // that reaches the card some other way must not be coerced here.
        let latest: any = { tag: 'tun-in', protocol: 'tun', settings: { autoOutboundsInterface: true } };
        const Harness = () => {
            const [inbound, setInbound] = React.useState<any>(latest);
            latest = inbound;
            return <InboundTun inbound={inbound} onChange={(_path, value) => setInbound({ ...inbound, settings: value })} />;
        };
        const { container } = render(<Harness />);
        const notice = container.querySelector('[data-wrong-type="autoOutboundsInterface"]')!;
        expect(notice.textContent).toContain('true');
        expect(notice.textContent).toContain('reads text');
        const box = container.querySelector('[data-tun-outbounds-interface] input') as HTMLInputElement;
        // The box is for the replacement; the held value is not offered back.
        expect(box.value).toBe('');

        fireEvent.click(notice.querySelector('button')!);
        expect('autoOutboundsInterface' in latest.settings).toBe(false);
        expect(container.querySelector('[data-wrong-type]')).toBeNull();
    });

    it('writes text over a wrong-typed value as soon as a name is typed', () => {
        let latest: any = { tag: 'tun-in', protocol: 'tun', settings: { autoOutboundsInterface: 1 } };
        const Harness = () => {
            const [inbound, setInbound] = React.useState<any>(latest);
            latest = inbound;
            return <InboundTun inbound={inbound} onChange={(_path, value) => setInbound({ ...inbound, settings: value })} />;
        };
        const { container } = render(<Harness />);
        fireEvent.change(container.querySelector('[data-tun-outbounds-interface] input')!, { target: { value: 'wlan0' } });
        expect(latest.settings.autoOutboundsInterface).toBe('wlan0');
        expect(container.querySelector('[data-wrong-type]')).toBeNull();
    });

    it('is not offered on a line that does not read it, and kept when the config has it', () => {
        onLine('26.3');
        expect(mount({ name: 'xray0' }).card()).toBeNull();
        cleanup();
        // It is there, so it is drawn — without a sentence claiming an effect.
        const held = mount({ autoOutboundsInterface: '' });
        expect(held.card()).not.toBeNull();
        expect(held.effect()).toBeNull();
    });

    it('draws the two keys v26.9.30 added where the line reads them, and not before', () => {
        const dns = 'Auto System Dns To Gateway';
        const wfp = 'Auto System Wfp Block Leak';
        onLine('26.9');
        const before = mount({ name: 'xray0' });
        expect(before.container.textContent).not.toContain(dns);
        expect(before.container.textContent).not.toContain(wfp);
        cleanup();
        for (const version of ['26.9.30', '26.10'] as const) {
            onLine(version);
            const view = mount({ name: 'xray0' });
            expect(view.container.textContent).toContain(dns);
            expect(view.container.textContent).toContain(wfp);
            cleanup();
        }
        // A held one stays on screen on the line that drops it.
        onLine('26.9');
        expect(mount({ autoSystemDnsToGateway: true }).container.textContent).toContain(dns);
    });

    it('leaves the other fields to drop out when they are emptied', () => {
        const view = mount({ name: 'xray0' });
        const name = Array.from(view.container.querySelectorAll('input')).find(box => box.value === 'xray0') as HTMLInputElement;
        fireEvent.change(name, { target: { value: '' } });
        expect('name' in view.saved()).toBe(false);
    });
});
