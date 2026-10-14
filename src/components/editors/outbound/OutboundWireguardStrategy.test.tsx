import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { OutboundWireguard } from './OutboundWireguard';
import { useConfigStore } from '../../../store/configStore';
import type { CoreVersionId } from '../../../core/xray/versions';
import { t } from '../../../i18n';

/**
 * 26.10 dropped `domainStrategy` from the WireGuard struct
 * (v26.10.10:infra/conf/wireguard.go:59-69): the key is ignored there, and its
 * value is no longer checked. So the chooser is offered where the key works,
 * and a config that already holds one sees it, with what the line does with it.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

beforeEach(() => onLine('26.9'));
afterEach(cleanup);

const draw = (settings: Record<string, unknown>) =>
    render(<OutboundWireguard outbound={{ protocol: 'wireguard', settings: { secretKey: '', peers: [], ...settings } }} onChange={() => {}} errors={{}} />);

describe('the WireGuard domain strategy', () => {
    it('is offered on the lines that read it', () => {
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            onLine(version);
            const view = draw({});
            expect(view.container.textContent).toContain(t("Domain Strategy"));
            cleanup();
        }
    });

    it('is not offered on 26.10, which has no such setting', () => {
        onLine('26.10');
        const view = draw({});
        expect(view.container.textContent).not.toContain(t("Domain Strategy"));
    });

    it('is shown on 26.10 when the config holds one, and says it does nothing there', () => {
        onLine('26.10');
        const view = draw({ domainStrategy: 'ForceIPv4' });
        expect(view.container.textContent).toContain(t("Domain Strategy"));
        expect(view.container.textContent).toContain('v26.10.10');
    });
});
