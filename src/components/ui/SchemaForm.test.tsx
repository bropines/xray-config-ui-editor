import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { z } from 'zod';
import { SchemaForm } from './SchemaForm';

/**
 * Most of this app's forms are not written; they are derived from a zod
 * schema. Which control a field gets depends on recognising the schema's
 * kind at runtime — and that recognition reads zod's internals, which the
 * library renamed between versions without anything here noticing. A form
 * that renders proves the whole chain: shape -> kind -> control.
 */

const schema = z.object({
    tag: z.string().optional(),
    port: z.number().optional(),
    udp: z.boolean().optional(),
    network: z.enum(['tcp', 'ws', 'grpc']).optional(),
    // The wrappers the unwrapper has to see through.
    level: z.number().default(0),
    note: z.string().nullable().optional(),
    // A union of literals is read as a choice, not as unknown.
    flow: z.union([z.literal('none'), z.literal('xtls-rprx-vision')]).optional(),
});

afterEach(cleanup);

const renderForm = (value: Record<string, unknown> = {}, onChange = (_: any) => {}) =>
    render(<SchemaForm schema={schema} value={value} onChange={onChange} />);

describe('SchemaForm', () => {
    it('gives a string field a text box carrying the current value', () => {
        const { container } = renderForm({ tag: 'socks-in' });
        const input = Array.from(container.querySelectorAll('input'))
            .find(i => (i as HTMLInputElement).value === 'socks-in');
        expect(input).toBeDefined();
    });

    it('gives a boolean field a switch, and reports the flip', () => {
        let received: any = null;
        renderForm({ udp: false }, next => { received = next; });
        const checkbox = screen.getAllByRole('checkbox')[0]!;
        fireEvent.click(checkbox);
        expect(received).toEqual({ udp: true });
    });

    it('gives an enum field its options, and reports the one chosen', () => {
        let received: any = null;
        renderForm({ network: 'tcp' }, next => { received = next; });
        // The chooser shows the current value; opening it lists the rest.
        fireEvent.click(screen.getByText('tcp'));
        fireEvent.click(screen.getByText('grpc'));
        expect(received).toEqual({ network: 'grpc' });
    });

    it('sees through optional, nullable and default to the type underneath', () => {
        const { container } = renderForm({ level: 3, note: 'hello' });
        const values = Array.from(container.querySelectorAll('input')).map(i => (i as HTMLInputElement).value);
        expect(values).toContain('3');
        expect(values).toContain('hello');
    });

    it('reads a union of literals as a choice', () => {
        let received: any = null;
        renderForm({ flow: 'none' }, next => { received = next; });
        fireEvent.click(screen.getByText('none'));
        fireEvent.click(screen.getByText('xtls-rprx-vision'));
        expect(received).toEqual({ flow: 'xtls-rprx-vision' });
    });

    it('leaves out the keys it was told to exclude', () => {
        render(<SchemaForm schema={schema} value={{ tag: 'a' }} onChange={() => {}} excludeKeys={['tag', 'port', 'udp', 'network', 'level', 'note', 'flow']} />);
        expect(screen.queryByText('tag')).toBeNull();
    });

    it('shows a field error next to its field', () => {
        render(<SchemaForm schema={schema} value={{ tag: '' }} onChange={() => {}} errors={{ tag: 'Tag is required' }} />);
        expect(screen.getByText('Tag is required')).toBeDefined();
    });
});

describe('a list of objects', () => {
    const withCerts = z.object({
        // The shape that produced "[object Object]" tags.
        certificates: z.array(z.object({
            certificateFile: z.string().optional(),
            keyFile: z.string().optional(),
        }).passthrough()).optional(),
        alpn: z.array(z.string()).optional(),
    });

    it('is never rendered as tags reading [object Object]', () => {
        const { container } = render(
            <SchemaForm
                schema={withCerts}
                value={{ certificates: [{ certificateFile: '/etc/xray/tls.crt', keyFile: '/etc/xray/tls.key' }] }}
                onChange={() => {}}
            />,
        );
        expect(container.textContent).not.toContain('[object Object]');
    });

    it('gives each entry real fields, not a JSON box', () => {
        const { container } = render(
            <SchemaForm
                schema={withCerts}
                value={{ certificates: [{ certificateFile: '/etc/xray/tls.crt', keyFile: '/etc/xray/tls.key' }] }}
                onChange={() => {}}
            />,
        );
        const values = Array.from(container.querySelectorAll('input')).map(i => (i as HTMLInputElement).value);
        expect(values).toContain('/etc/xray/tls.crt');
        expect(values).toContain('/etc/xray/tls.key');
        // The field the entry came from, spelled as a label rather than as JSON.
        expect(container.textContent).toContain('Certificate File');
        expect(container.querySelector('.cm-editor')).toBeNull();
    });

    it('edits one entry without disturbing the others', () => {
        let received: any = null;
        const { container } = render(
            <SchemaForm
                schema={withCerts}
                value={{ certificates: [{ keyFile: 'first.key' }, { keyFile: 'second.key' }] }}
                onChange={next => { received = next; }}
            />,
        );
        const input = Array.from(container.querySelectorAll('input'))
            .find(i => (i as HTMLInputElement).value === 'second.key') as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(input, 'changed.key');
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(received.certificates).toHaveLength(2);
        expect(received.certificates[0].keyFile).toBe('first.key');
        expect(received.certificates[1].keyFile).toBe('changed.key');
    });

    it('can add an entry and drop one', () => {
        let received: any = null;
        const { container } = render(
            <SchemaForm
                schema={withCerts}
                value={{ certificates: [{ keyFile: 'only.key' }] }}
                onChange={next => { received = next; }}
            />,
        );
        const buttons = Array.from(container.querySelectorAll('button'));
        fireEvent.click(buttons.find(b => /Add|Добавить/.test(b.textContent ?? ''))!);
        expect(received.certificates).toHaveLength(2);

        fireEvent.click(container.querySelector('button[title]')!);
        expect(received.certificates).toHaveLength(0);
    });

    it('still gives a list of strings its tag input', () => {
        const { container } = render(
            <SchemaForm schema={withCerts} value={{ alpn: ['h2', 'http/1.1'] }} onChange={() => {}} />,
        );
        expect(container.textContent).toContain('h2');
        expect(container.textContent).toContain('http/1.1');
    });
});

/**
 * The fallback used to be a text input for every type the form did not
 * recognise — objects included. A text input writes a string, and the core
 * decodes these keys into structs and maps, where a string fails the config.
 * These are the shapes that reached it, each from a real schema.
 */
describe('a key that holds an object', () => {
    const structured = z.object({
        tag: z.string().optional(),
        // RealitySchema.limitFallbackUpload: an object with a shape.
        limit: z.object({ bytesPerSec: z.number().optional() }).passthrough().optional(),
        // WebhookObjectSchema.headers, TlsSchema.echSockopt: a map.
        headers: z.record(z.string(), z.string()).optional(),
        // InboundSchema.settings.
        settings: z.record(z.string(), z.unknown()).optional(),
        // RoutingRuleSchema.webhook: a string or an object.
        webhook: z.union([z.string(), z.object({ url: z.string() })]).optional(),
        // DnsSchema.servers: a list of strings and objects mixed.
        servers: z.array(z.union([z.string(), z.object({ address: z.string() })])).optional(),
        // Nothing the form recognises at all.
        anything: z.any().optional(),
    });
    const KEYS = ['limit', 'headers', 'settings', 'webhook', 'servers', 'anything'];

    const typeInto = (box: HTMLTextAreaElement, text: string) => {
        fireEvent.change(box, { target: { value: text } });
    };

    const draw = (value: Record<string, unknown>, only?: string) => {
        const writes: any[] = [];
        const view = render(
            <SchemaForm
                schema={structured}
                value={value}
                onChange={next => writes.push(next)}
                excludeKeys={only ? Object.keys(structured.shape).filter(key => key !== only) : []}
            />,
        );
        const boxOf = (key: string) =>
            view.container.querySelector(`[data-structured-field="${key}"] textarea`) as HTMLTextAreaElement | null;
        return { ...view, writes, last: () => writes[writes.length - 1], boxOf };
    };

    it('is never a text input', () => {
        const { container, boxOf } = draw({});
        // One text input in the whole form: the string key.
        expect(container.querySelectorAll('input[type="text"]')).toHaveLength(1);
        for (const key of KEYS) expect(boxOf(key)).not.toBeNull();
    });

    it('is never shown as [object Object]', () => {
        const { container, boxOf } = draw({
            limit: { bytesPerSec: 5 },
            headers: { Authorization: 'Bearer x' },
            webhook: { url: 'https://a.example' },
            servers: ['1.1.1.1', { address: '8.8.8.8' }],
        });
        expect(container.textContent).not.toContain('[object Object]');
        const values = Array.from(container.querySelectorAll('input')).map(i => (i as HTMLInputElement).value);
        expect(values.join('|')).not.toContain('[object Object]');
        expect(boxOf('headers')!.value).toContain('"Authorization": "Bearer x"');
        expect(boxOf('servers')!.value).toContain('"address": "8.8.8.8"');
    });

    it('writes an object, not the text of one', () => {
        for (const key of ['limit', 'headers', 'settings']) {
            const { boxOf, last } = draw({}, key);
            typeInto(boxOf(key)!, '{"a": "b"}');
            expect(last()).toEqual({ [key]: { a: 'b' } });
            expect(typeof last()[key]).toBe('object');
            cleanup();
        }
    });

    it('does not write a string into an object key, however it is typed', () => {
        const { boxOf, writes, container } = draw({ headers: { a: 'b' } }, 'headers');
        typeInto(boxOf('headers')!, 'Authorization: Bearer token');
        typeInto(boxOf('headers')!, '"Authorization: Bearer token"');
        expect(writes).toEqual([]);
        expect(container.textContent).toContain('keeps the last valid value');
    });

    it('removes the key when the box is emptied, rather than writing ""', () => {
        const { boxOf, last } = draw({ tag: 'a', headers: { a: 'b' } }, 'headers');
        typeInto(boxOf('headers')!, '');
        expect(last()).toEqual({ tag: 'a' });
        expect('headers' in last()).toBe(false);
    });

    it('shows a string the old form wrote, says the core refuses it, and removes it', () => {
        const { container, boxOf, last } = draw({ tag: 'a', limit: '1048576' }, 'limit');
        const notice = container.querySelector('[data-wrong-type="limit"]')!;
        expect(notice).not.toBeNull();
        expect(notice.textContent).toContain('"1048576"');
        expect(notice.textContent).toContain('cannot read the config');
        // The box is for the replacement; the wrong value is not offered back.
        expect(boxOf('limit')!.value).toBe('');

        fireEvent.click(notice.querySelector('button')!);
        expect(last()).toEqual({ tag: 'a' });
    });

    it('replaces such a string with an object once one is typed', () => {
        const { boxOf, last } = draw({ limit: 'oops' }, 'limit');
        typeInto(boxOf('limit')!, '{"bytesPerSec": 5}');
        expect(last()).toEqual({ limit: { bytesPerSec: 5 } });
    });

    it('does not call a string wrong where the schema takes one too', () => {
        const { container, boxOf, last } = draw({ webhook: 'https://a.example' }, 'webhook');
        expect(container.querySelector('[data-wrong-type]')).toBeNull();
        expect(boxOf('webhook')!.value).toBe('"https://a.example"');
        typeInto(boxOf('webhook')!, '{"url": "https://b.example"}');
        expect(last()).toEqual({ webhook: { url: 'https://b.example' } });
    });

    it('keeps a mixed list a list', () => {
        const { boxOf, last, writes } = draw({}, 'servers');
        typeInto(boxOf('servers')!, '{"address": "8.8.8.8"}');
        expect(writes).toEqual([]);
        typeInto(boxOf('servers')!, '["1.1.1.1", {"address": "8.8.8.8"}]');
        expect(last()).toEqual({ servers: ['1.1.1.1', { address: '8.8.8.8' }] });
    });

    it('hands a key to its own editor when the form is given one', () => {
        let seen: any = null;
        const writes: any[] = [];
        const { container } = render(
            <SchemaForm
                schema={structured}
                value={{ tag: 'a', limit: { bytesPerSec: 5 } }}
                onChange={next => writes.push(next)}
                excludeKeys={['headers', 'settings', 'webhook', 'servers', 'anything']}
                errors={{ limit: 'too fast' }}
                fieldEditors={{
                    limit: field => {
                        seen = field;
                        return <button data-own-editor onClick={() => field.onChange(undefined)}>{field.label}</button>;
                    },
                }}
            />,
        );
        expect(container.querySelector('[data-structured-field="limit"]')).toBeNull();
        expect(seen.value).toEqual({ bytesPerSec: 5 });
        expect(seen.error).toBe('too fast');
        expect(seen.label).toBe('Limit');
        // undefined from an editor removes the key, the same as the JSON box.
        fireEvent.click(container.querySelector('[data-own-editor]')!);
        expect(writes[0]).toEqual({ tag: 'a' });
    });
});
