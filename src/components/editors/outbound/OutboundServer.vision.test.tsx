import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { produce } from 'immer';
import { OutboundServer } from './OutboundServer';
import { useConfigStore } from '../../../store/configStore';
import { t } from '../../../i18n';

/**
 * A VLESS outbound had no flow field at all — the factory writes one, and only
 * the raw JSON could change it — and nothing for the Vision padding numbers or
 * the pre-connect count. Its account sits in one of two places depending on
 * whether `address` is in the settings, and the form edited only the vnext one.
 */

const VISION = 'xtls-rprx-vision';
const TAG = 'v26.7.28';

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

const listed = (user: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
    protocol: 'vless',
    settings: { vnext: [{ address: 'h.example', port: 443, users: [{ id: 'u-1', encryption: 'none', flow: VISION, ...user }] }] },
    streamSettings: { security: 'reality' },
    ...extra,
});

const flat = (settings: Record<string, unknown> = {}) => ({
    protocol: 'vless',
    settings: { address: 'h.example', port: 443, id: 'u-1', encryption: 'none', flow: VISION, ...settings },
    streamSettings: { security: 'reality' },
});

const SECTION = () => t("Pre-connect and Vision padding");
const openSection = () => fireEvent.click(screen.getByText(SECTION()));
const seedBoxes = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLInputElement>('[data-vision-seed="outbound"] [data-seed-entry] input'));
const preBox = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>('input[placeholder="0"]')!;

describe('the flow of a VLESS outbound', () => {
    it('is drawn, showing the one the config holds', () => {
        mount(listed());
        expect(screen.getByText(t("Flow"))).toBeDefined();
        expect(screen.getByText(VISION)).toBeDefined();
    });

    it('is not drawn for the other protocols', () => {
        mount({ protocol: 'vmess', settings: { vnext: [{ address: 'h', port: 1, users: [{ id: 'u' }] }] } });
        expect(screen.queryByText(t("Flow"))).toBeNull();
        expect(screen.queryByText(SECTION())).toBeNull();
    });

    it('lists the three values an outbound takes', () => {
        mount(listed({ flow: undefined }));
        fireEvent.click(screen.getByText(t("None")));
        expect(screen.getByText(VISION)).toBeDefined();
        expect(screen.getByText(`${VISION}-udp443`)).toBeDefined();
    });

    it('writes into the user, where the core reads it', () => {
        const { current } = mount(listed({ flow: undefined }));
        fireEvent.click(screen.getByText(t("None")));
        fireEvent.click(screen.getByText(`${VISION}-udp443`));
        expect(current().settings.vnext[0].users[0].flow).toBe(`${VISION}-udp443`);
    });

    it('removes the key when None is chosen', () => {
        const { current } = mount(listed());
        fireEvent.click(screen.getByText(VISION));
        fireEvent.click(screen.getByText(t("None")));
        expect(current().settings.vnext[0].users[0].flow).toBeUndefined();
    });

    it('shows a flow the line refuses, labelled, instead of swapping it', () => {
        mount(listed({ flow: 'xtls-rprx-direct' }));
        expect(screen.getByText(t("{value} (Xray {tag} refuses it)", { value: 'xtls-rprx-direct', tag: TAG }))).toBeDefined();
    });

    it('shows a flow that is not text for what it is, with a way out', () => {
        const { container, current } = mount(listed({ flow: 7 }));
        expect(container.querySelector('[data-wrong-type="flow"]')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.vnext[0].users[0].flow).toBeUndefined();
    });

    it('says where Vision cannot run, under the field', () => {
        const { container } = mount(listed({}, { streamSettings: { network: 'ws', security: 'tls' } }));
        const note = container.querySelector('[data-outbound-flow] [data-problem="flow.transport"]') as HTMLElement;
        expect(note).not.toBeNull();
        expect(note.textContent).toContain('ws');
        cleanup();
        const ok = mount(listed({}, { streamSettings: { network: 'tcp', security: 'reality' } }));
        expect(ok.container.querySelector('[data-problem="flow.transport"]')).toBeNull();
    });
});

describe('a flat VLESS outbound', () => {
    it('shows its address, port and id, which the card used to look for in vnext', () => {
        const { container } = mount(flat());
        const inputs = Array.from(container.querySelectorAll('input')).map(input => input.value);
        expect(inputs).toContain('h.example');
        expect(inputs).toContain('443');
        expect(inputs).toContain('u-1');
    });

    it('writes the id and the address into the settings, not into a vnext list nothing reads', () => {
        const { container, current } = mount(flat());
        fireEvent.change(container.querySelector<HTMLInputElement>('input[value="u-1"]')!, { target: { value: 'u-2' } });
        fireEvent.change(container.querySelector<HTMLInputElement>('input[value="h.example"]')!, { target: { value: 'z.example' } });
        expect(current().settings.id).toBe('u-2');
        expect(current().settings.address).toBe('z.example');
        expect(current().settings.vnext).toBeUndefined();
    });

    it('writes its flow into the settings', () => {
        const { current } = mount(flat());
        fireEvent.click(screen.getByText(VISION));
        fireEvent.click(screen.getByText(t("None")));
        expect(current().settings.flow).toBeUndefined();
        expect(current().settings.vnext).toBeUndefined();
    });

    it('does the same for a flat VMess id', () => {
        const { container, current } = mount({ protocol: 'vmess', settings: { address: 'h', port: 1, id: 'u-1' } });
        fireEvent.change(container.querySelector<HTMLInputElement>('input[value="u-1"]')!, { target: { value: 'u-9' } });
        expect(current().settings.id).toBe('u-9');
        expect(current().settings.vnext).toBeUndefined();
    });
});

describe('pre-connect and the padding numbers', () => {
    it('are in a collapsed section that opens by itself when the config holds either', () => {
        const closed = mount(listed());
        expect(screen.getByText(SECTION())).toBeDefined();
        expect(screen.queryByText(t("Pre-connect"))).toBeNull();
        closed.unmount();

        mount(listed({ testpre: 4 }));
        expect(screen.getByText(t("Pre-connect"))).toBeDefined();
    });

    it('write testpre as a number into the user of a vnext outbound', () => {
        const { container, current } = mount(listed());
        openSection();
        fireEvent.change(preBox(container), { target: { value: '4' } });
        expect(current().settings.vnext[0].users[0].testpre).toBe(4);
        expect(current().settings.testpre).toBeUndefined();
        fireEvent.change(preBox(container), { target: { value: '2.9' } });
        expect(current().settings.vnext[0].users[0].testpre).toBe(2);
    });

    it('write testpre into the settings of a flat one', () => {
        const { container, current } = mount(flat());
        openSection();
        fireEvent.change(preBox(container), { target: { value: '3' } });
        expect(current().settings.testpre).toBe(3);
        expect(current().settings.vnext).toBeUndefined();
    });

    it('remove testpre when the box is emptied', () => {
        const { container, current } = mount(listed({ testpre: 4 }));
        fireEvent.change(preBox(container), { target: { value: '' } });
        expect(current().settings.vnext[0].users[0].testpre).toBeUndefined();
    });

    it('show a testpre of the wrong type as what it is, with a way out', () => {
        const { container, current } = mount(listed({ testpre: '4' }));
        expect(container.querySelector('[data-wrong-type="testpre"]')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.vnext[0].users[0].testpre).toBeUndefined();
    });

    it('say what a testpre does not do: ignored with a reverse, and a lot of sockets', () => {
        const withReverse = mount(flat({ testpre: 4, reverse: { tag: 'r' } }));
        expect(withReverse.container.querySelector('[data-problem="testpre.reverse"]')).not.toBeNull();
        cleanup();
        const crowd = mount(listed({ testpre: 500 }));
        expect(crowd.container.querySelector('[data-problem="testpre.large"]')).not.toBeNull();
    });

    it('write the padding numbers whole, into the same user', () => {
        const { container, current } = mount(listed());
        openSection();
        expect(seedBoxes(container).map(box => box.placeholder)).toEqual(['900', '500', '900', '256']);
        fireEvent.change(seedBoxes(container)[3]!, { target: { value: '300' } });
        expect(current().settings.vnext[0].users[0].testseed).toEqual([900, 500, 900, 300]);
    });

    it('write them into the settings of a flat outbound', () => {
        const { container, current } = mount(flat());
        openSection();
        fireEvent.change(seedBoxes(container)[0]!, { target: { value: '1000' } });
        expect(current().settings.testseed).toEqual([1000, 500, 900, 256]);
        expect(current().settings.vnext).toBeUndefined();
    });

    it('say they pad what this client sends', () => {
        mount(listed());
        openSection();
        expect(screen.getByText(t("Padding added to what this client sends. The server needs no matching numbers."))).toBeDefined();
    });

    it('remove the key from the foot', () => {
        const { current } = mount(listed({ testseed: [1000, 600, 1000, 300] }));
        fireEvent.click(screen.getByText(t("Use Xray's numbers")));
        expect(current().settings.vnext[0].users[0].testseed).toBeUndefined();
    });

    it('call a 0 where the core would panic what it is, next to the box', () => {
        const { container } = mount(listed({ testseed: [900, 500, 900, 0] }));
        const problem = container.querySelector('[data-problem="testseed.zero"]') as HTMLElement;
        expect(problem.textContent).toContain('settings.vnext[0].users[0].testseed[3]');
        expect(seedBoxes(container)[3]!.className).toContain('border-rose-500');
    });

    it('say the numbers do nothing without Vision', () => {
        const { container } = mount(listed({ flow: undefined, testseed: [900, 500, 900, 256] }));
        expect(container.querySelector('[data-problem="testseed.inert"]')).not.toBeNull();
    });

    it('show a list of the wrong type as what it is, with a way out', () => {
        const { container, current } = mount(listed({ testseed: { a: 1 } }));
        expect(container.querySelector('[data-wrong-type="testseed"]')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.vnext[0].users[0].testseed).toBeUndefined();
    });
});
