import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { RuleEditor } from './RuleEditor';
import { t } from '../../../i18n';

/**
 * A rule's `webhook` is an object on every line: the core decodes it into a
 * struct, and a bare URL string there fails the rule and the config with it
 * (v26.7.28:infra/conf/router.go:151-157). The form used to hide a string
 * behind an empty webhook form, so a config that could not load looked as if
 * it had no webhook at all.
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
                outboundTags={['direct', 'proxy']}
                balancerTags={[]}
                inboundTags={[]}
                geoData={{ sites: [], ips: [], loading: false }}
                rawMode={false}
                allRules={[initial]}
            />
        );
    };
    const view = render(<Harness />);
    return { ...view, last: () => seen[seen.length - 1] };
};

const base = { type: 'field', domain: ['example.com'], outboundTag: 'direct' };

describe('a rule with a bare-string webhook', () => {
    it('shows it for what it is, rather than an empty form', () => {
        const { container } = mount({ ...base, webhook: 'https://hook.example/notify' });
        const notice = container.querySelector('[data-wrong-type="webhook"]') as HTMLElement;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain('https://hook.example/notify');
    });

    it('can be removed from the notice, and the notice goes with it', () => {
        const { container, last } = mount({ ...base, webhook: 'https://hook.example/notify' });
        fireEvent.click(screen.getByText(t("Remove it")));
        expect(last()).toEqual(base);
        expect(container.querySelector('[data-wrong-type="webhook"]')).toBeNull();
    });

    it('is replaced by an object when the form is filled in', () => {
        const { last } = mount({ ...base, webhook: 'https://hook.example/notify' });
        fireEvent.change(screen.getByPlaceholderText('https://api.site.com/hook'), { target: { value: 'https://hook.example/new' } });
        expect(last().webhook).toEqual({ url: 'https://hook.example/new' });
    });
});

describe('a rule with a webhook object', () => {
    it('draws the form with the values it has, and no notice', () => {
        const { container } = mount({ ...base, webhook: { url: 'https://hook.example', deduplication: 10 } });
        expect(container.querySelector('[data-wrong-type="webhook"]')).toBeNull();
        expect((screen.getByPlaceholderText('https://api.site.com/hook') as HTMLInputElement).value).toBe('https://hook.example');
        expect(container.querySelector('[data-webhook-problems]')).toBeNull();
    });

    it('names a header whose value is not a string', () => {
        const { container } = mount({ ...base, webhook: { url: 'https://hook.example', headers: { A: 'b', N: 5 } } });
        const problems = container.querySelectorAll('[data-webhook-problems] [data-problem="webhook.headers.value"]');
        expect(problems).toHaveLength(1);
        expect(problems[0]!.textContent).toContain('"N"');
    });

    it('warns that one without a url is dropped', () => {
        const { container } = mount({ ...base, webhook: { deduplication: 10 } });
        expect(container.querySelector('[data-problem="webhook.url.missing"]')).not.toBeNull();
    });

    it('shows a webhook headers value that is not an object, with a way out', () => {
        const { container } = mount({ ...base, webhook: { url: 'https://hook.example', headers: 'Authorization: x' } });
        expect(container.querySelector('[data-wrong-type="headers"]')).not.toBeNull();
        expect(container.querySelector('[data-problem="webhook.headers.type"]')).not.toBeNull();
    });
});

describe('a rule with no webhook', () => {
    it('shows nothing about one', () => {
        const { container } = mount(base);
        expect(container.querySelector('[data-wrong-type="webhook"]')).toBeNull();
        expect(container.querySelector('[data-webhook-problems]')).toBeNull();
    });

    it('tolerates a null one, which the core leaves nil', () => {
        const { container } = mount({ ...base, webhook: null });
        expect(container.querySelector('[data-wrong-type="webhook"]')).toBeNull();
    });
});
