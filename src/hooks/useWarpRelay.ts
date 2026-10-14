import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '../store/configStore';
import { warpRelay, type WarpRelay } from '../core/generators/warp-relay';

/** The WARP relay the settings point at: the user's own, or the built-in one. */
export function useWarpRelay(): WarpRelay {
    const { url, key } = useConfigStore(useShallow(state => ({ url: state.warpWorkerUrl, key: state.warpWorkerKey })));
    return useMemo(() => warpRelay(url, key), [url, key]);
}
