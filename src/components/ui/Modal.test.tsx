import { afterEach, describe, expect, it } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { Modal, ModalBottomBar } from './Modal';
import { __resetBackLayers } from '../../hooks/useBackToClose';
import { t } from '../../i18n';

/**
 * The shell decides where a control lives: a desktop puts the module's own
 * buttons and its tabs beside the content, a phone puts everything you tap at
 * the foot, where a thumb reaches. That decision is a media query, not a
 * class, so only a rendered tree can check it.
 */

const PHONE = 400;
const DESKTOP = 1280;

const at = (width: number, ui: React.ReactElement) => {
    globalThis.setViewportWidth(width);
    return render(ui);
};

/** The sheet itself — the flex column holding header, body and footer. */
const panel = () => screen.getByText('Editor').closest('div')!.parentElement!.parentElement!;

const bottomBar = () => screen.queryByTestId('modal-bottom-bar');

afterEach(() => {
    cleanup();
    __resetBackLayers();
    globalThis.setViewportWidth(DESKTOP);
});

describe('Modal', () => {
    it('renders its title and its children', () => {
        at(DESKTOP, <Modal title="Editor" onClose={() => {}}><p>body</p></Modal>);
        expect(screen.getByText('Editor')).toBeDefined();
        expect(screen.getByText('body')).toBeDefined();
    });

    it('closes on Escape', () => {
        let closed = false;
        at(DESKTOP, <Modal title="Editor" onClose={() => { closed = true; }}>x</Modal>);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(closed).toBe(true);
    });

    it('puts the module buttons in the footer, below the body', () => {
        at(PHONE, (
            <Modal title="Editor" onClose={() => {}} extraButtons={<button>JSON Mode</button>}>
                <p>body</p>
            </Modal>
        ));
        const json = screen.getByText('JSON Mode');
        const close = screen.getByText(t("Close"));
        // Same footer, and the footer comes after the body.
        const footer = close.closest('div')!.parentElement!;
        expect(footer.contains(json)).toBe(true);
        expect(footer.compareDocumentPosition(screen.getByText('body')))
            .toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it('keeps a tab strip beside the content on a desktop', () => {
        at(DESKTOP, (
            <Modal title="Editor" onClose={() => {}} tabs={<button>Policy</button>}>
                <p>body</p>
            </Modal>
        ));
        const tabs = screen.getByText('Policy');
        const body = screen.getByText('body');
        // Above the content it introduces, and inside the same scroll area.
        expect(tabs.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(tabs.closest('div')!.parentElement).toBe(body.parentElement);
    });

    it('moves the tab strip below the content on a phone', () => {
        at(PHONE, (
            <Modal title="Editor" onClose={() => {}} tabs={<button>Policy</button>}>
                <p>body</p>
            </Modal>
        ));
        const tabs = screen.getByText('Policy');
        const body = screen.getByText('body');
        expect(body.compareDocumentPosition(tabs)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        // Its own strip, not the body's scroll area.
        expect(tabs.closest('div')!.parentElement).not.toBe(body.parentElement);
        // And above the way out.
        expect(tabs.compareDocumentPosition(screen.getByText(t("Close"))))
            .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders exactly one copy of each slot', () => {
        at(PHONE, (
            <Modal title="Editor" onClose={() => {}} tabs={<button>Policy</button>} extraButtons={<button>JSON Mode</button>}>
                <p>body</p>
            </Modal>
        ));
        expect(screen.getAllByText('Policy')).toHaveLength(1);
        expect(screen.getAllByText('JSON Mode')).toHaveLength(1);
    });

    it('shows the corner × only when there is no footer to hold a way out', () => {
        const { container } = at(PHONE, <Modal title="Editor" onClose={() => {}}>x</Modal>);
        expect(screen.queryByText(t("Close"))).not.toBeNull();
        cleanup();

        at(PHONE, <Modal title="Editor" onClose={() => {}} hideFooter>x</Modal>);
        expect(screen.queryByText(t("Close"))).toBeNull();
        // The header's button is the only one left.
        expect(container).toBeDefined();
    });
});

describe('ModalBottomBar', () => {
    it('folds away when a sheet sends it nothing', () => {
        at(PHONE, <Modal title="Editor" onClose={() => {}}><p>body</p></Modal>);
        const bar = bottomBar()!;
        expect(bar.childElementCount).toBe(0);
        // `:empty` is what hides it, and only an empty bar matches.
        expect(bar.className).toContain('empty:hidden');
    });

    it('lifts a control out of the body and into the bar on a phone', () => {
        at(PHONE, (
            <Modal title="Editor" onClose={() => {}}>
                <div>
                    <p>body</p>
                    <ModalBottomBar><button>Back</button></ModalBottomBar>
                </div>
            </Modal>
        ));
        const back = screen.getByText('Back');
        expect(bottomBar()!.contains(back)).toBe(true);
        expect(screen.getByText('body').parentElement!.contains(back)).toBe(false);
        expect(back.compareDocumentPosition(screen.getByText(t("Close"))))
            .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('leaves the control where it was written on a desktop', () => {
        at(DESKTOP, (
            <Modal title="Editor" onClose={() => {}}>
                <div data-testid="pane">
                    <p>body</p>
                    <ModalBottomBar><button>Back</button></ModalBottomBar>
                </div>
            </Modal>
        ));
        expect(bottomBar()).toBeNull();
        expect(screen.getByTestId('pane').contains(screen.getByText('Back'))).toBe(true);
    });

    it('renders in place when it is used outside a Modal', () => {
        render(<ModalBottomBar><button>Loose</button></ModalBottomBar>);
        expect(screen.getByText('Loose')).toBeDefined();
    });

    it('follows the viewport when it changes under it', () => {
        at(DESKTOP, (
            <Modal title="Editor" onClose={() => {}}>
                <ModalBottomBar><button>Back</button></ModalBottomBar>
            </Modal>
        ));
        expect(bottomBar()).toBeNull();

        // The width change is a store update; React has to be told.
        act(() => globalThis.setViewportWidth(PHONE));
        expect(bottomBar()!.contains(screen.getByText('Back'))).toBe(true);
    });

    it('gives every control at the foot the same height and an equal share', () => {
        at(PHONE, (
            <Modal title="Editor" onClose={() => {}}>
                <ModalBottomBar><button>Back</button></ModalBottomBar>
                <ModalBottomBar><button>JSON</button></ModalBottomBar>
            </Modal>
        ));
        const bar = bottomBar()!;
        // Two portals, two columns of the same width.
        expect(bar.childElementCount).toBe(2);
        for (const wrapper of Array.from(bar.children)) {
            expect(wrapper.className).toContain('flex-1');
        }
        // And the row, not the control's own padding, sets the height.
        expect(bar.className).toContain('[&_button]:h-9');
    });

    it('leaves the keyboard the room it takes', () => {
        // Safari draws the keyboard over the page rather than resizing it, so
        // a sheet claiming the whole screen puts its footer underneath.
        at(PHONE, <Modal title="Editor" onClose={() => {}}><p>body</p></Modal>);
        expect(panel().className).toContain('--keyboard-inset');
    });

    it('does not keep the sheet from being the panel it was', () => {
        at(PHONE, <Modal title="Editor" onClose={() => {}}><p>body</p></Modal>);
        expect(panel().className).toContain('flex-col');
    });
});
