import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { RuleEditor } from './RuleEditor';
import { t } from '../../../i18n';

/**
 * A rule's `attrs` is a map of strings on every line (core/xray/routing-attrs.ts).
 * The box used to write whatever JSON it parsed — a string, a list, an object
 * with a number in it — and each of those fails the rule's decode and the
 * config with it.
 */

afterEach(cleanup);

/** The editor over a rule it can change, the way RoutingModal drives it. */
const mount = (initial: any) => {
    const seen: any[] = [];
    const Harness = () => {
        const [rule, setRule] = useState(initial);
        return (
            <RuleEditor
                rule={rule}
                onChange={(next: any) => {
                    seen.push(next);
                    setRule(next);
                }}
                outboundTags={['direct']}
                balancerTags={[]}
                inboundTags={[]}
                geoData={{ sites: [], ips: [], loading: false }}
                rawMode={false}
                allRules={[initial]}
            />
        );
    };
    const view = render(<Harness />);
    const box = () => view.container.querySelector('[data-rule-attrs] textarea') as HTMLTextAreaElement;
    /** A rule with nothing extended starts with the section shut. */
    const open = () => fireEvent.click(screen.getByText(t("Extended Rule Settings & Webhooks")));
    return { ...view, seen, box, open, last: () => seen[seen.length - 1] };
};

const base = { type: 'field', domain: ['example.com'], outboundTag: 'direct' };

describe('the attrs box', () => {
    it('writes an object of strings', () => {
        const { box, last, open } = mount(base);
        open();
        fireEvent.change(box(), { target: { value: '{ ":method": "GET" }' } });
        expect(last().attrs).toEqual({ ':method': 'GET' });
    });

    it('writes nothing that is not an object of strings, and says so', () => {
        const { box, seen, container, open } = mount(base);
        open();
        for (const text of ['"GET"', '[":method", "GET"]', '5', '{ ":method": 1 }', '{ ":method": { "a": "b" } }']) {
            fireEvent.change(box(), { target: { value: text } });
            expect(container.textContent).toContain(t("This key takes a JSON object whose values are all strings, in quotes — the config keeps the last valid value."));
        }
        expect(seen).toEqual([]);
    });

    it('removes the key when emptied', () => {
        const { box, last } = mount({ ...base, attrs: { ':method': 'GET' } });
        fireEvent.change(box(), { target: { value: '' } });
        expect('attrs' in last()).toBe(false);
    });

    it('shows what the rule holds', () => {
        const { box, container } = mount({ ...base, attrs: { ':path': '^/api/' } });
        expect(JSON.parse(box().value)).toEqual({ ':path': '^/api/' });
        expect(container.querySelector('[data-wrong-type="attrs"]')).toBeNull();
        expect(container.querySelector('[data-attrs-problems]')).toBeNull();
    });
});

describe('a held attrs of the wrong type', () => {
    it('is shown for what it is, with a way out, and the box is left for the replacement', () => {
        const { container, box } = mount({ ...base, attrs: "attrs[':method'] == 'GET'" });
        const notice = container.querySelector('[data-wrong-type="attrs"]') as HTMLElement;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain(":method");
        expect(box().value).toBe('');
    });

    it('can be removed from the notice, and the notice goes with it', () => {
        const { container, last } = mount({ ...base, attrs: ['GET'] });
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(last()).toEqual(base);
        expect(container.querySelector('[data-wrong-type="attrs"]')).toBeNull();
    });

    it('is replaced by what is typed into the box', () => {
        const { box, last, container } = mount({ ...base, attrs: 'GET' });
        fireEvent.change(box(), { target: { value: '{ ":method": "GET" }' } });
        expect(last().attrs).toEqual({ ':method': 'GET' });
        expect(container.querySelector('[data-wrong-type="attrs"]')).toBeNull();
    });
});

describe('a held attrs object with a value that is not a string', () => {
    it('is drawn in the box, with the value named under it rather than the typing hint', () => {
        const { box, container } = mount({ ...base, attrs: { ':method': 'GET', ':path': 5 } });
        expect(JSON.parse(box().value)).toEqual({ ':method': 'GET', ':path': 5 });
        expect(box().getAttribute('aria-invalid')).toBe('true');
        const problems = container.querySelectorAll('[data-attrs-problems] [data-problem="attrs.value"]');
        expect(problems).toHaveLength(1);
        expect(problems[0]!.textContent).toContain('":path"');
        // The config holds exactly this; "keeps the last valid value" would be untrue.
        expect(container.textContent).not.toContain('keeps the last valid value');
    });

    it('is fixed in place', () => {
        const { box, last, container } = mount({ ...base, attrs: { ':path': 5 } });
        fireEvent.change(box(), { target: { value: '{ ":path": "5" }' } });
        expect(last().attrs).toEqual({ ':path': '5' });
        expect(container.querySelector('[data-attrs-problems]')).toBeNull();
    });
});
