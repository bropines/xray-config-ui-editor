import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TransportSettings } from './TransportSettings';
import { useConfigStore } from '../../../store/configStore';
import { TlsSchema } from '../../../core/xray/schemas';
import { TLS_FIELDS } from '../../../core/xray/field-directions';
import { auditDirections } from '../../../core/xray/field-directions';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * `tlsSettings.useSystemCA` arrived with 26.10, together with a new default for
 * the trust store: the bundle built into Xray, not the operating system's
 * (v26.10.10:transport/internet/tls/config.go:583-616). Earlier lines read the
 * key from nowhere, so a value a config carries there is dropped silently.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.10'));
afterEach(cleanup);

const draw = (tlsSettings: any, isClient = true) => {
    const writes: any[] = [];
    const view = render(
        <TransportSettings
            streamSettings={{ network: 'tcp', security: 'tls', tlsSettings }}
            onChange={next => writes.push(next)}
            isClient={isClient}
            protocol="vless"
        />,
    );
    const header = Array.from(view.container.querySelectorAll('button'))
        .find(button => (button.textContent ?? '').includes('Extended TLS Settings'));
    if (header) fireEvent.click(header);
    return { ...view, writes, last: () => writes[writes.length - 1], text: () => view.container.textContent ?? '' };
};

describe('useSystemCA', () => {
    it('is a TLS key the schema and the direction table both know, read by the client', () => {
        expect(Object.keys(TlsSchema.shape)).toContain('useSystemCA');
        expect(TLS_FIELDS.useSystemCA).toMatchObject({ direction: 'client', advanced: true });
        expect(auditDirections(Object.keys(TlsSchema.shape), TLS_FIELDS)).toEqual({ undeclared: [], stale: [], unreachable: [] });
    });

    it('is offered on 26.10, with what it changes there', () => {
        const form = draw({ serverName: 'example.com' });
        expect(form.text()).toContain(t("Trust the system CA store"));
    });

    it('is not offered to a server, which verifies no peer certificate chain with it', () => {
        const form = draw({ certificates: [] }, false);
        expect(form.text()).not.toContain(t("Trust the system CA store"));
    });

    it('is not offered on a line that drops it', () => {
        onLine('26.9');
        const form = draw({ serverName: 'example.com' });
        expect(form.text()).not.toContain(t("Trust the system CA store"));
    });

    it('is shown, with its status and a way out, when a config holds it on such a line', () => {
        onLine('26.9');
        const form = draw({ serverName: 'example.com', useSystemCA: true });
        const notice = form.container.querySelector('[data-version-notice="tlsSettings.useSystemCA"]');
        expect(notice).not.toBeNull();
        expect(notice!.textContent).toContain('v26.9.9');
        fireEvent.click(notice!.querySelector('button')!);
        expect('useSystemCA' in (form.last().tlsSettings ?? {})).toBe(false);
    });
});
