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

    it('hands it to the JSON editor, where the objects can be read and edited', async () => {
        render(
            <SchemaForm
                schema={withCerts}
                value={{ certificates: [{ certificateFile: '/etc/xray/tls.crt', keyFile: '/etc/xray/tls.key' }] }}
                onChange={() => {}}
            />,
        );
        // CodeMirror is fetched on demand, so the field is the editor's
        // boundary first and the editor once it lands.
        expect(await screen.findByText(/certificateFile|Loading editor/)).toBeDefined();
    });

    it('still gives a list of strings its tag input', () => {
        const { container } = render(
            <SchemaForm schema={withCerts} value={{ alpn: ['h2', 'http/1.1'] }} onChange={() => {}} />,
        );
        expect(container.textContent).toContain('h2');
        expect(container.textContent).toContain('http/1.1');
    });
});
