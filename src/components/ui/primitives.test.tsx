import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from './Button';
import { Switch } from './Switch';
import { Select } from './Select';
import { Icon } from './Icon';

/**
 * The primitives every screen is built from. Nothing here is clever — which is
 * the point: until now none of it had a test that rendered anything, so a
 * prop that quietly went nowhere (`Icon`'s `size`, `Card`'s `action`) could
 * ship for months.
 */

afterEach(cleanup);

describe('Button', () => {
    it('renders its label and calls back on a click', () => {
        let clicks = 0;
        render(<Button onClick={() => { clicks += 1; }}>Save</Button>);
        fireEvent.click(screen.getByText('Save'));
        expect(clicks).toBe(1);
    });

    it('does not fire while disabled', () => {
        let clicks = 0;
        render(<Button disabled onClick={() => { clicks += 1; }}>Save</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(clicks).toBe(0);
    });

    it('is disabled while loading, so a slow action cannot be fired twice', () => {
        let clicks = 0;
        render(<Button loading onClick={() => { clicks += 1; }}>Save</Button>);
        const button = screen.getByRole('button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        fireEvent.click(button);
        expect(clicks).toBe(0);
    });

    it('draws the icon it is given', () => {
        const { container } = render(<Button icon="FloppyDisk">Save</Button>);
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('takes a variant it has, and every one of them styles something', () => {
        for (const variant of ['primary', 'success', 'danger', 'secondary', 'ghost', 'warning'] as const) {
            const { container, unmount } = render(<Button variant={variant}>x</Button>);
            // A variant that fell through would leave only the shared base.
            expect(container.querySelector('button')!.className).toMatch(/bg-|text-black/);
            unmount();
        }
    });
});

describe('Switch', () => {
    it('reports the new state, not the old one', () => {
        const seen: boolean[] = [];
        const { rerender } = render(<Switch checked={false} onChange={v => seen.push(v)} label="UDP" />);
        fireEvent.click(screen.getByRole('checkbox'));
        rerender(<Switch checked onChange={v => seen.push(v)} label="UDP" />);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(seen).toEqual([true, false]);
    });

    it('stays put when disabled', () => {
        const seen: boolean[] = [];
        render(<Switch checked={false} disabled onChange={v => seen.push(v)} />);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(seen).toEqual([]);
    });

    it('is labelled by its own text', () => {
        render(<Switch checked onChange={() => {}} label="Enable sniffing" />);
        expect(screen.getByText('Enable sniffing')).toBeDefined();
    });
});

describe('Select', () => {
    const options = [
        { value: 'tcp', label: 'TCP' },
        { value: 'ws', label: 'WebSocket' },
    ];

    it('shows the label of the value it holds, not the value', () => {
        render(<Select value="ws" onChange={() => {}} options={options} />);
        expect(screen.getByText('WebSocket')).toBeDefined();
    });

    it('offers the options once opened, and reports the one picked', () => {
        let picked = '';
        render(<Select value="tcp" onChange={v => { picked = v; }} options={options} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('WebSocket'));
        expect(picked).toBe('ws');
    });

    it('does not open while disabled', () => {
        render(<Select value="tcp" disabled onChange={() => {}} options={options} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.queryByText('WebSocket')).toBeNull();
    });
});

describe('Icon', () => {
    it('draws path data, not an empty box', () => {
        const { container } = render(<Icon name="Trash" />);
        expect(container.querySelector('path')).not.toBeNull();
    });

    it('accepts the lower-case spellings the app actually uses', () => {
        for (const name of ['spinner', 'x']) {
            const { container, unmount } = render(<Icon name={name} />);
            expect(container.querySelector('path')).not.toBeNull();
            unmount();
        }
    });

    it('renders nothing rather than throwing on a name it does not have', () => {
        const { container } = render(<Icon name="NotAnIconAtAll" />);
        expect(container.querySelector('path')).toBeNull();
    });
});
