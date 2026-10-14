import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React, { useState } from 'react';
import { XDriveSettingsEditor } from './XDriveSettingsEditor';
import { NetworkSection } from './NetworkSection';
import { useConfigStore } from '../../../store/configStore';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * The xdrive form (26.10), drawn over real state and read back from what it
 * wrote — the JSON is what XDriveConfig decodes. What the core refuses comes
 * from core/xray/xdrive.ts; these tests only check that the form says it
 * beside the right field and writes the right types.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.10'));
afterEach(cleanup);

const type = (input: Element | null, value: string) => fireEvent.change(input as HTMLElement, { target: { value } });

const mount = (initial: unknown, isClient = true) => {
    let latest: unknown = initial;
    const Harness = () => {
        const [value, setValue] = useState<unknown>(initial);
        latest = value;
        return <XDriveSettingsEditor settings={value} onChange={next => setValue(next)} isClient={isClient} protocol="vless" />;
    };
    const view = render(<Harness />);
    const $ = (selector: string) => view.container.querySelector(selector);
    return {
        ...view,
        $,
        current: () => JSON.parse(JSON.stringify(latest ?? null)),
        folder: () => $(`input[aria-label="${t("Remote folder")}"]`),
        text: () => view.container.textContent ?? '',
        pick: (service: string) => {
            const trigger = Array.from(view.container.querySelectorAll('[data-xdrive-settings] button'))
                .find(button => button.textContent?.includes(t("Pick a service")));
            fireEvent.click(trigger as HTMLElement);
            const option = Array.from(document.querySelectorAll('button')).find(button => button.querySelector('span')?.textContent === service);
            fireEvent.click(option as HTMLElement);
        },
    };
};

describe('the xdrive form', () => {
    it('writes the folder, and takes the key out when it is emptied', () => {
        const form = mount({ service: 'local' });
        type(form.folder(), '/srv/xdrive');
        expect(form.current()).toEqual({ service: 'local', remoteFolder: '/srv/xdrive' });
        type(form.folder(), '');
        expect(form.current()).toEqual({ service: 'local' });
    });

    it('says what the store needs, beside the field', () => {
        const form = mount({ service: 'local' });
        expect(form.text()).toContain('xdriveSettings.remoteFolder is empty');
        type(form.folder(), '/srv/xdrive');
        expect(form.$('[data-xdrive-problem]')).toBeNull();
    });

    it('picks a service by its exact name', () => {
        const form = mount(undefined);
        form.pick('Google Drive');
        expect(form.current()).toEqual({ service: 'Google Drive' });
    });

    it('takes Google Drive secrets as three labelled fields, in order', () => {
        const form = mount({ service: 'Google Drive', remoteFolder: '1AbC' });
        expect(form.$('[data-xdrive-secrets="google-drive"]')).not.toBeNull();
        expect(form.text()).toContain('takes exactly three');
        type(form.$(`input[aria-label="${t("Refresh token")}"]`), 'token');
        expect(form.current().secrets).toEqual(['', '', 'token']);
        type(form.$(`input[aria-label="${t("Client ID")}"]`), 'id');
        type(form.$(`input[aria-label="${t("Client secret")}"]`), 'secret');
        expect(form.current().secrets).toEqual(['id', 'secret', 'token']);
        expect(form.$('[data-xdrive-problem]')).toBeNull();
    });

    it('takes template secrets as a list that grows and shrinks', () => {
        const form = mount({ service: 'template', template: { put: { url: 'u' } } });
        fireEvent.click(Array.from(form.container.querySelectorAll('button')).find(button => button.textContent?.includes(t("Add a secret")))!);
        type(form.$('input[aria-label="secret0"]'), 'user');
        fireEvent.click(Array.from(form.container.querySelectorAll('button')).find(button => button.textContent?.includes(t("Add a secret")))!);
        type(form.$('input[aria-label="secret1"]'), 'pass');
        expect(form.current().secrets).toEqual(['user', 'pass']);
        fireEvent.click(form.$(`[data-xdrive-secrets="list"] button[aria-label="${t("Remove")}"]`)!);
        expect(form.current().secrets).toEqual(['pass']);
    });

    it('keeps a list row that is cleared to be retyped, and drops the three Google Drive fields together', () => {
        const list = mount({ service: 'template', template: {}, secrets: ['user'] });
        type(list.$('input[aria-label="secret0"]'), '');
        expect(list.current().secrets).toEqual(['']);
        expect(list.$('input[aria-label="secret0"]')).not.toBeNull();
        cleanup();
        const drive = mount({ service: 'Google Drive', secrets: ['id', '', ''] });
        type(drive.$(`input[aria-label="${t("Client ID")}"]`), '');
        expect('secrets' in drive.current()).toBe(false);
    });

    it('writes the template as JSON and says what it is missing', () => {
        const form = mount({ service: 'template' });
        expect(form.text()).toContain('xdriveSettings.template is not set');
        const box = form.$(`[data-xdrive-template] textarea`);
        type(box, '{ "put": { "url": "https://dav.example/{folder}/{name}" } }');
        expect(form.current().template).toEqual({ put: { url: 'https://dav.example/{folder}/{name}' } });
        expect(form.text()).toContain('xdriveSettings.template.get.url is empty');
        expect(form.text()).toContain('xdriveSettings.template.list.namesRegex is empty');
    });

    it('writes the tuning numbers as numbers, and drops an emptied one', () => {
        const form = mount({ service: 'local', remoteFolder: '/x', concurrency: 16 });
        const box = form.$('[data-xdrive-numbers] input[placeholder="8"]');
        expect((box as HTMLInputElement).value).toBe('16');
        type(box, '32');
        expect(form.current().concurrency).toBe(32);
        type(box, '');
        expect('concurrency' in form.current()).toBe(false);
    });
});

describe('what the config already holds', () => {
    it('keeps a service the form does not offer, and says why the core refuses it', () => {
        const form = mount({ service: 'Dropbox', remoteFolder: '/x' });
        expect(form.text()).toContain('Dropbox');
        expect(form.text()).toContain('xdriveSettings.service is "Dropbox"');
        expect(form.current().service).toBe('Dropbox');
    });

    it('shows settings that are not an object, with a way out', () => {
        const form = mount('local');
        expect(form.$('[data-wrong-type="xdriveSettings"]')).not.toBeNull();
        fireEvent.click(Array.from(form.container.querySelectorAll('[data-wrong-type] button'))[0] as HTMLElement);
        expect(form.current()).toBeNull();
    });

    it('shows a number held as text, with the core\'s words and a way out', () => {
        const form = mount({ service: 'local', remoteFolder: '/x', segmentBytes: '512k' });
        const held = form.$('[data-xdrive-numbers] [data-xdrive-wrong-type]');
        expect(held?.textContent).toContain('"512k"');
        fireEvent.click(held!.querySelector('button')!);
        expect('segmentBytes' in form.current()).toBe(false);
    });

    it('shows a template store holding a template that is not an object', () => {
        const form = mount({ service: 'template', template: '{"put":{}}' });
        expect(form.$('[data-xdrive-template] [data-xdrive-wrong-type]')).not.toBeNull();
        expect((form.$('[data-xdrive-template] textarea') as HTMLTextAreaElement).value).toBe('');
    });

    it('is a notice with a way out on a line that drops the key, and nothing when there is none', () => {
        onLine('26.9');
        const form = mount({ service: 'local', remoteFolder: '/x' });
        expect(form.$('[data-xdrive-settings="unknown-line"]')).not.toBeNull();
        expect(form.folder()).toBeNull();
        expect(form.text()).toContain('v26.9.9');
        fireEvent.click(form.$('[data-xdrive-settings="unknown-line"] button')!);
        expect(form.current()).toBeNull();
        cleanup();
        expect(mount(undefined).$('[data-xdrive-settings]')).toBeNull();
    });
});

describe('the transport section on network xdrive', () => {
    const mountSection = (stream: any) => {
        let latest: any = stream;
        const Harness = () => {
            const [value, setValue] = useState<any>(stream);
            latest = value;
            return <NetworkSection streamSettings={value} onChange={setValue} net={String(value.network)} isClient={false} protocol="vless" />;
        };
        const view = render(<Harness />);
        return { ...view, current: () => JSON.parse(JSON.stringify(latest)) };
    };

    it('opens the form, says a transport with no settings has no service, and writes the key', () => {
        const form = mountSection({ network: 'xdrive' });
        expect(form.container.querySelector('[data-xdrive-settings]')).not.toBeNull();
        expect(form.container.textContent).toContain('has no xdriveSettings');
        expect(form.container.textContent).toContain('The inbound does not start');
        type(form.container.querySelector(`input[aria-label="${t("Remote folder")}"]`), '/srv/x');
        expect(form.current()).toEqual({ network: 'xdrive', xdriveSettings: { remoteFolder: '/srv/x' } });
        type(form.container.querySelector(`input[aria-label="${t("Remote folder")}"]`), '');
        expect('xdriveSettings' in form.current()).toBe(false);
    });
});
