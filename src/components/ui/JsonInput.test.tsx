import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { JsonInput } from './JsonInput';

/**
 * The JSON box a form uses for one value. What it must never do is what the
 * text input before it did: hand the config the text.
 */

afterEach(cleanup);

/** Types into the box; fireEvent runs it inside act(), state update and all. */
const typeInto = (box: HTMLTextAreaElement, value: string) => {
    fireEvent.change(box, { target: { value } });
};

const draw = (value: unknown, expects?: 'object' | 'array' | 'any') => {
    const writes: unknown[] = [];
    const view = render(<JsonInput value={value} onChange={next => writes.push(next)} expects={expects} />);
    const box = view.container.querySelector('textarea') as HTMLTextAreaElement;
    return { ...view, box, writes };
};

describe('JsonInput', () => {
    it('shows the value as JSON, and nothing for no value', () => {
        expect(draw({ mark: 255 }).box.value).toBe('{\n  "mark": 255\n}');
        cleanup();
        expect(draw(undefined).box.value).toBe('');
    });

    it('writes the parsed value, not the text', () => {
        const { box, writes } = draw(undefined);
        typeInto(box, '{"mark": 255}');
        expect(writes).toEqual([{ mark: 255 }]);
    });

    it('keeps the last valid value while the text is mid-edit, and says so', () => {
        const { box, writes, container } = draw({ mark: 255 });
        typeInto(box, '{"mark": 25');
        expect(writes).toEqual([]);
        expect(container.textContent).toContain('keeps the last valid value');
        expect(box.getAttribute('aria-invalid')).toBe('true');
        // …and stops saying so once the JSON is whole again.
        typeInto(box, '{"mark": 25}');
        expect(writes).toEqual([{ mark: 25 }]);
        expect(container.textContent).not.toContain('keeps the last valid value');
    });

    it('writes undefined when emptied, so the caller removes the key', () => {
        const { box, writes } = draw({ mark: 255 });
        typeInto(box, '   ');
        expect(writes).toEqual([undefined]);
    });

    it('refuses valid JSON of the wrong kind for an object key', () => {
        const { box, writes, container } = draw(undefined, 'object');
        for (const text of ['"eth0"', '1000', '[1, 2]', 'null', 'true']) {
            typeInto(box, text);
            expect(container.textContent).toContain('JSON object');
        }
        expect(writes).toEqual([]);
        typeInto(box, '{}');
        expect(writes).toEqual([{}]);
    });

    it('refuses an object where a list is wanted', () => {
        const { box, writes, container } = draw(undefined, 'array');
        typeInto(box, '{"a": 1}');
        expect(writes).toEqual([]);
        expect(container.textContent).toContain('JSON list');
        typeInto(box, '["a"]');
        expect(writes).toEqual([['a']]);
    });

    it('takes any JSON when nothing narrower is asked for', () => {
        // FinalmaskEditor's use: the layer's settings decide the kind.
        const { box, writes } = draw(undefined);
        typeInto(box, '"text"');
        typeInto(box, '[1]');
        expect(writes).toEqual(['text', [1]]);
    });

    it('refills when the value changes underneath it', () => {
        const { box, rerender } = draw({ a: 1 });
        rerender(<JsonInput value={{ b: 2 }} onChange={() => {}} />);
        expect(box.value).toBe('{\n  "b": 2\n}');
    });

    it('leaves the text as typed when the new value is what it already says', () => {
        const writes: unknown[] = [];
        const { container, rerender } = render(<JsonInput value={undefined} onChange={next => writes.push(next)} />);
        const box = container.querySelector('textarea') as HTMLTextAreaElement;
        typeInto(box, '{"a":1}');
        // The parent hands the written value back; the compact spelling stays.
        rerender(<JsonInput value={writes[0]} onChange={() => {}} />);
        expect(box.value).toBe('{"a":1}');
    });
});
