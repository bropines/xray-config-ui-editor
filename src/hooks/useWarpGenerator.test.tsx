import { afterEach, describe, expect, it } from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useWarpGenerator } from './useWarpGenerator';
import { useConfigStore } from '../store/configStore';
import type { CoreVersionId } from '../core/xray/versions';

/**
 * WARP over MASQUE needs `masqueSettings.warp`, and only 26.10 has it:
 * v26.9.30 registers the masque transport but its MasqueConfig has no warp
 * field (v26.9.30:infra/conf/transport_method.go:793-799), so a masque outbound
 * written for it could not reach Cloudflare. The generator's MASQUE switch
 * follows the version table, line by line.
 */

const onLine = (version: CoreVersionId) => {
    act(() => {
        useConfigStore.setState({ coreVersion: version });
    });
};

afterEach(cleanup);

describe('the WARP generator', () => {
    it('offers MASQUE on 26.10 only', () => {
        const offered = (version: CoreVersionId) => {
            onLine(version);
            return renderHook(() => useWarpGenerator(() => {}, () => {})).result.current.masqueOffered;
        };
        expect(offered('26.3')).toBe(false);
        expect(offered('26.7')).toBe(false);
        expect(offered('26.9')).toBe(false);
        expect(offered('26.9.30')).toBe(false);
        expect(offered('26.10')).toBe(true);
    });

    it('names the tag it is writing for, so the refusal can say which core cannot do it', () => {
        onLine('26.9.30');
        expect(renderHook(() => useWarpGenerator(() => {}, () => {})).result.current.coreTag).toBe('v26.9.30');
    });
});
