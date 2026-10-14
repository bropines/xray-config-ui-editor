import { afterEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { ListTextInput } from './ListTextInput';

afterEach(cleanup);

/** The box over a value it can write to, with the value readable and settable from outside. */
const mount = (initial: unknown, props: Partial<React.ComponentProps<typeof ListTextInput>> = {}) => {
    const written: unknown[] = [];
    let set: (value: unknown) => void = () => {};
    const Harness = () => {
        const [value, setValue] = useState<unknown>(initial);
        set = setValue;
        return (
            <ListTextInput
                aria-label="list"
                {...props}
                value={value}
                onChange={(next: unknown) => {
                    written.push(next);
                    setValue(next);
                }}
            />
        );
    };
    render(<Harness />);
    const field = screen.getByLabelText('list') as HTMLInputElement;
    return { field, written, set: (value: unknown) => act(() => set(value)) };
};

const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });

describe('a list typed as text', () => {
    it('shows what the config holds', () => {
        expect(mount(['a', 'b']).field.value).toBe('a, b');
        cleanup();
        expect(mount(undefined).field.value).toBe('');
    });

    it('keeps a comma that has just been typed, and writes only whole entries', () => {
        const { field, written } = mount(['1.1.1.1']);
        type(field, '1.1.1.1,');
        expect(field.value).toBe('1.1.1.1,');
        type(field, '1.1.1.1, ');
        expect(field.value).toBe('1.1.1.1, ');
        type(field, '1.1.1.1, 1.0.0.1');
        expect(field.value).toBe('1.1.1.1, 1.0.0.1');
        expect(written.at(-1)).toEqual(['1.1.1.1', '1.0.0.1']);
        for (const list of written) if (list) expect(list as string[]).not.toContain('');
    });

    it('splits on spaces as well as commas', () => {
        const { field, written } = mount(undefined);
        type(field, 'a b,c   d');
        expect(written.at(-1)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('writes undefined, never an empty list, when emptied', () => {
        const { field, written } = mount(['a']);
        type(field, '');
        expect(written.at(-1)).toBeUndefined();
        type(field, ' , ');
        expect(written.at(-1)).toBeUndefined();
    });

    it('is refilled when the list changes underneath it', () => {
        const { field, set } = mount(['a']);
        type(field, 'a, ');
        // The same list as the text means: the box is left as typed.
        set(['a']);
        expect(field.value).toBe('a, ');
        // A different one: the box follows it.
        set(['x', 'y']);
        expect(field.value).toBe('x, y');
    });

    it('does not mind a value that is not a list', () => {
        expect(mount('10.0.0.2/32').field.value).toBe('');
        cleanup();
        expect(mount({ a: 1 }).field.value).toBe('');
    });

    it('reads entries as numbers and refuses other characters, when asked', () => {
        const { field, written } = mount(undefined, { read: Number, allowed: '0-9' });
        type(field, '1a, 2b,');
        expect(field.value).toBe('1, 2,');
        expect(written.at(-1)).toEqual([1, 2]);
    });

    it('can be a box instead of a line', () => {
        const { field } = mount(['a'], { multiline: true });
        expect(field.tagName).toBe('TEXTAREA');
    });
});
