import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { produce } from 'immer';
import { InboundClients } from './InboundClients';
import { useConfigStore } from '../../../store/configStore';
import { t } from '../../../i18n';

/**
 * A VLESS inbound's flow was drawn per client and nowhere else, so an inbound
 * with no clients — a panel's config profile — had no flow field at all, and
 * Vision's padding numbers (`testseed`) had no field anywhere.
 */

const VISION = 'xtls-rprx-vision';
const TAG = 'v26.7.28';

const original = useConfigStore.getState().remnawave;

beforeEach(() => {
    act(() => {
        useConfigStore.setState({ coreVersion: '26.7', remnawave: { ...original, connected: false } });
    });
});
afterEach(() => {
    cleanup();
    act(() => {
        useConfigStore.setState({ remnawave: original });
    });
});

/** Renders the card and applies its writes the way the editor's updateField does. */
const mount = (initial: any) => {
    let inbound = initial;
    const view = render(<InboundClients inbound={inbound} onChange={() => {}} />);
    const draw = () => view.rerender(
        <InboundClients
            inbound={inbound}
            onChange={(path: string | (string | number)[], value: any) => {
                inbound = produce(inbound, (draft: any) => {
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
    return { ...view, current: () => inbound };
};

const vless = (settings: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
    protocol: 'vless', port: 443, settings: { decryption: 'none', clients: [], ...settings }, ...extra,
});

/** The seed editors of one scope, in document order. */
const editors = (container: HTMLElement, scope: string): Element[] =>
    Array.from(container.querySelectorAll(`[data-vision-seed="${scope}"]`));

/** The four boxes of one seed editor, in order. */
const boxes = (container: HTMLElement, scope: string, which = 0): HTMLInputElement[] =>
    Array.from(editors(container, scope)[which]!.querySelectorAll<HTMLInputElement>('[data-seed-entry] input'));

const openEditor = (container: HTMLElement, scope: string, which = 0) => {
    fireEvent.click(editors(container, scope)[which]!.querySelector('button[aria-expanded]')!);
};

describe('the default flow', () => {
    it('is there for a VLESS inbound with no clients at all', () => {
        mount(vless());
        expect(screen.getByText(t("Default flow"))).toBeDefined();
        expect(screen.getByText(t("VLESS defaults"))).toBeDefined();
    });

    it('is not drawn for the other multi-user protocols', () => {
        mount({ protocol: 'vmess', port: 1, settings: { clients: [] } });
        expect(screen.queryByText(t("Default flow"))).toBeNull();
        cleanup();
        mount({ protocol: 'trojan', port: 1, settings: { clients: [] } });
        expect(screen.queryByText(t("Default flow"))).toBeNull();
    });

    it('lists what an inbound takes and writes the choice', () => {
        const { current } = mount(vless());
        fireEvent.click(screen.getByText(t("None")));
        // The udp443 spelling is a client-side value an inbound refuses.
        expect(screen.queryByText(`${VISION}-udp443`)).toBeNull();
        fireEvent.click(screen.getByText(VISION));
        expect(current().settings.flow).toBe(VISION);
    });

    it('removes the key when None is chosen', () => {
        const { current } = mount(vless({ flow: VISION }));
        fireEvent.click(screen.getByText(VISION));
        fireEvent.click(screen.getByText(t("None")));
        expect(current().settings.flow).toBeUndefined();
        expect('flow' in JSON.parse(JSON.stringify(current().settings))).toBe(false);
    });

    it('shows a flow the line refuses, labelled, instead of swapping it', () => {
        mount(vless({ flow: 'xtls-rprx-vision-udp443' }));
        expect(screen.getByText(t("{value} (Xray {tag} refuses it)", { value: 'xtls-rprx-vision-udp443', tag: TAG }))).toBeDefined();
    });

    it('shows a flow that is not text for what it is, with a way out', () => {
        const { container, current } = mount(vless({ flow: true }));
        const notice = container.querySelector('[data-wrong-type="flow"]') as HTMLElement;
        expect(notice.textContent).toContain('true');
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.flow).toBeUndefined();
        expect(container.querySelector('[data-wrong-type="flow"]')).toBeNull();
    });

    it('says in its help that it reaches only the clients Xray loads, not one added later', () => {
        const { container } = mount(vless());
        // The Help is a button next to the label; its text is in the bubble once opened.
        fireEvent.click(container.querySelector('button[aria-label="?"]')!);
        expect(document.body.textContent).toContain(t("Clients that have no flow of their own get this one when Xray loads the config. A user added to a running Xray through its API arrives with its own account and does not get it. With Vision here, a client that connects without the flow has its TCP connections turned away."));
    });
});

describe('a client with no flow of its own', () => {
    it('shows the default it inherits', () => {
        mount(vless({ flow: VISION, clients: [{ id: 'a', email: 'a@x' }] }));
        expect(screen.getByText(t("Inherits {flow}", { flow: VISION }))).toBeDefined();
    });

    it('shows None when there is nothing to inherit', () => {
        mount(vless({ clients: [{ id: 'a', email: 'a@x' }] }));
        expect(screen.queryByText(/Inherits/)).toBeNull();
        // The default's own select and the client's.
        expect(screen.getAllByText(t("None"))).toHaveLength(2);
    });

    it('keeps its own flow over the default', () => {
        mount(vless({ flow: VISION, clients: [{ id: 'a', flow: VISION }] }));
        expect(screen.queryByText(/Inherits/)).toBeNull();
    });

    it('writes the flow it is given', () => {
        const { current } = mount(vless({ flow: VISION, clients: [{ id: 'a' }] }));
        fireEvent.click(screen.getByText(t("Inherits {flow}", { flow: VISION })));
        // The default's own select shows the same word; the open list is last in the document.
        fireEvent.click(screen.getAllByText(VISION).at(-1)!);
        expect(current().settings.clients[0].flow).toBe(VISION);
    });

    it('shows a flow that is not text, with a way out', () => {
        const { container, current } = mount(vless({ clients: [{ id: 'a', flow: 5 }] }));
        expect(container.querySelector('[data-wrong-type="flow"]')).not.toBeNull();
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.clients[0].flow).toBeUndefined();
    });
});

describe('under a Remnawave panel', () => {
    it('still offers the defaults of a VLESS inbound, which the panel has no say over', () => {
        act(() => {
            useConfigStore.setState({ remnawave: { ...original, connected: true } });
        });
        mount(vless());
        expect(screen.getByText(t("Managed by Remnawave"))).toBeDefined();
        expect(screen.getByText(t("Default flow"))).toBeDefined();
        // The client list is the panel's.
        expect(screen.queryByText(t("Clients / Users"))).toBeNull();
    });

    it('leaves the other protocols with the notice alone', () => {
        act(() => {
            useConfigStore.setState({ remnawave: { ...original, connected: true } });
        });
        mount({ protocol: 'vmess', port: 1, settings: { clients: [] } });
        expect(screen.getByText(t("Managed by Remnawave"))).toBeDefined();
        expect(screen.queryByText(t("Default flow"))).toBeNull();
    });
});

describe('the inbound-wide padding numbers', () => {
    it('start collapsed, and say Xray\'s own are used', () => {
        const { container } = mount(vless());
        expect(container.querySelector('[data-vision-seed="inbound"]')).not.toBeNull();
        expect(container.querySelector('[data-vision-seed="inbound"] [data-seed-entry]')).toBeNull();
        expect(container.querySelector('[data-vision-seed-summary]')!.textContent).toBe(t("Xray's defaults"));
    });

    it('show Xray\'s numbers as placeholders and write the whole list once one is typed', () => {
        const { container, current } = mount(vless());
        openEditor(container, 'inbound');
        const fields = boxes(container, 'inbound');
        expect(fields.map(box => box.placeholder)).toEqual(['900', '500', '900', '256']);
        expect(fields.map(box => box.value)).toEqual(['', '', '', '']);

        fireEvent.change(fields[1]!, { target: { value: '700' } });
        // Fewer than four is thrown away whole by the core, so all four are written.
        expect(current().settings.testseed).toEqual([900, 700, 900, 256]);
        expect(boxes(container, 'inbound').map(box => box.value)).toEqual(['900', '700', '900', '256']);
    });

    it('write numbers, never text', () => {
        const { container, current } = mount(vless());
        openEditor(container, 'inbound');
        fireEvent.change(boxes(container, 'inbound')[0]!, { target: { value: '1200' } });
        expect(current().settings.testseed.every((entry: unknown) => typeof entry === 'number')).toBe(true);
        fireEvent.change(boxes(container, 'inbound')[2]!, { target: { value: '12.7' } });
        expect(current().settings.testseed[2]).toBe(12);
        fireEvent.change(boxes(container, 'inbound')[2]!, { target: { value: '-4' } });
        expect(current().settings.testseed[2]).toBe(0);
    });

    it('let a box be emptied to retype it, and put the held number back on leaving', () => {
        const { container, current } = mount(vless({ testseed: [900, 500, 900, 256] }));
        openEditor(container, 'inbound');
        fireEvent.change(boxes(container, 'inbound')[0]!, { target: { value: '' } });
        expect(boxes(container, 'inbound')[0]!.value).toBe('');
        expect(current().settings.testseed).toEqual([900, 500, 900, 256]);
        fireEvent.blur(boxes(container, 'inbound')[0]!);
        expect(boxes(container, 'inbound')[0]!.value).toBe('900');
    });

    it('show what the config holds, and remove the key from the foot', () => {
        const { container, current } = mount(vless({ testseed: [1000, 600, 1000, 300] }));
        expect(container.querySelector('[data-vision-seed-summary]')!.textContent).toBe('1000 · 600 · 1000 · 300');
        openEditor(container, 'inbound');
        expect(boxes(container, 'inbound').map(box => box.value)).toEqual(['1000', '600', '1000', '300']);
        fireEvent.click(screen.getByText(t("Use Xray's numbers")));
        expect(current().settings.testseed).toBeUndefined();
    });

    it('open by themselves for a 0 that stops the core, and say so', () => {
        const { container } = mount(vless({ testseed: [900, 0, 900, 256] }));
        const problem = container.querySelector('[data-problem="testseed.zero"]') as HTMLElement;
        expect(problem).not.toBeNull();
        expect(problem.textContent).toContain('settings.testseed[1]');
        expect(boxes(container, 'inbound')[1]!.className).toContain('border-rose-500');
    });

    it('open by themselves for a list of the wrong type, and offer a way out', () => {
        const { container, current } = mount(vless({ testseed: '900,500,900,256' }));
        expect(container.querySelector('[data-wrong-type="testseed"]')).not.toBeNull();
        expect(boxes(container, 'inbound').map(box => box.value)).toEqual(['', '', '', '']);
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(current().settings.testseed).toBeUndefined();
    });

    it('replace a list of the wrong type when a number is typed over it', () => {
        const { container, current } = mount(vless({ testseed: ['900', 500, 900, 256] }));
        fireEvent.change(boxes(container, 'inbound')[0]!, { target: { value: '800' } });
        expect(current().settings.testseed).toEqual([800, 500, 900, 256]);
        expect(container.querySelector('[data-wrong-type="testseed"]')).toBeNull();
    });

    it('say that fewer than four numbers are ignored', () => {
        const { container } = mount(vless({ testseed: [900, 500] }));
        expect(container.querySelector('[data-problem="testseed.short"]')).not.toBeNull();
        expect(boxes(container, 'inbound').map(box => box.value)).toEqual(['900', '500', '', '']);
    });

    it('explain that they pad what the server sends, and reach only the clients Xray loads', () => {
        const { container } = mount(vless());
        openEditor(container, 'inbound');
        expect(screen.getByText(t("Padding added to what the server sends back. Clients with no numbers of their own use these."))).toBeDefined();
    });
});

describe('a client\'s padding numbers', () => {
    const withClients = (settings: Record<string, unknown> = {}) => vless({
        flow: VISION,
        clients: [{ id: 'a', email: 'a@x' }, { id: 'b', email: 'b@x', testseed: [800, 400, 800, 200] }],
        ...settings,
    });

    it('are one collapsed line per client, showing what applies', () => {
        const { container } = mount(withClients());
        const summaries = Array.from(container.querySelectorAll('[data-vision-seed="client"] [data-vision-seed-summary]')).map(node => node.textContent);
        expect(summaries).toEqual([t("Same as the inbound"), '800 · 400 · 800 · 200']);
    });

    it('write to the client that was edited and to no other', () => {
        const { container, current } = mount(withClients());
        openEditor(container, 'client', 0);
        fireEvent.change(boxes(container, 'client', 0)[3]!, { target: { value: '100' } });
        expect(current().settings.clients[0].testseed).toEqual([900, 500, 900, 100]);
        expect(current().settings.clients[1].testseed).toEqual([800, 400, 800, 200]);
        expect(current().settings.testseed).toBeUndefined();
    });

    it('use the inbound\'s numbers as the placeholders, and fill the others from them', () => {
        const { container, current } = mount(withClients({ testseed: [1000, 600, 1000, 300] }));
        openEditor(container, 'client', 0);
        expect(boxes(container, 'client', 0).map(box => box.placeholder)).toEqual(['1000', '600', '1000', '300']);
        fireEvent.change(boxes(container, 'client', 0)[0]!, { target: { value: '1' } });
        expect(current().settings.clients[0].testseed).toEqual([1, 600, 1000, 300]);
    });

    it('can be removed, which sends the client back to the inbound\'s', () => {
        const { container, current } = mount(withClients());
        openEditor(container, 'client', 1);
        fireEvent.click(screen.getByText(t("Use the inbound's numbers")));
        expect(current().settings.clients[1].testseed).toBeUndefined();
    });

    it('open by themselves when a client holds a 0, and name the client\'s own key', () => {
        const { container } = mount(withClients({
            clients: [{ id: 'a' }, { id: 'b', testseed: [900, 500, 900, 0] }],
        }));
        const problem = container.querySelector('[data-vision-seed="client"] [data-problem="testseed.zero"]') as HTMLElement;
        expect(problem.textContent).toContain('settings.clients[1].testseed[3]');
    });

    it('say that numbers do nothing for a client that runs no Vision', () => {
        const { container } = mount(vless({ clients: [{ id: 'a', testseed: [900, 500, 900, 256] }] }));
        // A warning opens the editor by itself, like an error does.
        const problem = container.querySelector('[data-vision-seed="client"] [data-problem="testseed.inert"]') as HTMLElement;
        expect(problem.textContent).toContain(t("no flow"));
    });
});

describe('a Vision client on a stream that cannot carry it', () => {
    it('is told so above the list', () => {
        const { container } = mount(vless(
            { flow: VISION, clients: [{ id: 'a' }] },
            { streamSettings: { network: 'ws', security: 'tls' } },
        ));
        const note = container.querySelector('[data-problem="flow.transport"]') as HTMLElement;
        expect(note).not.toBeNull();
        expect(note.textContent).toContain('ws');
    });

    it('is left alone on REALITY over tcp', () => {
        const { container } = mount(vless(
            { flow: VISION, clients: [{ id: 'a' }] },
            { streamSettings: { network: 'tcp', security: 'reality' } },
        ));
        expect(container.querySelector('[data-problem="flow.transport"]')).toBeNull();
    });
});
