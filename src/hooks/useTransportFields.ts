import { useField, type FieldPath } from './useField';

/**
 * Binds a transport editor to one `streamSettings` object.
 *
 * Every path below is the ONE place the wiring lives; the markup that reads
 * these is free to be rearranged without touching any of it. `streamSettings`
 * plays the role of an editor's `local` state and `update` the role of its
 * `updateField(path, value)` — the same shape `useXrayEditor` exposes, scoped
 * to this one sub-object.
 */
export const useTransportFields = (streamSettings: any, onChange: (next: any) => void) => {
    // its `updateField(path, value)` — same shape as useXrayEditor's, just
    // scoped to this one sub-object. useField binds directly on top of it, so
    // every path below is the ONE place the wiring to streamSettings lives;
    // the JSX under it can be restyled freely (see InboundClients.tsx for the
    // same pattern against the full editor state).
    const update = (path: FieldPath, value: any) => {
        const pathArr = Array.isArray(path) ? path : [path];
        const newObj = JSON.parse(JSON.stringify(streamSettings));
        let curr = newObj;
        for (let i = 0; i < pathArr.length - 1; i++) {
            const key = pathArr[i];
            if (key === undefined) return;
            if (!curr[key]) curr[key] = {};
            curr = curr[key];
        }
        const leaf = pathArr[pathArr.length - 1];
        if (leaf === undefined) return;
        curr[leaf] = value;
        onChange(newObj);
    };

    const network = useField<string>(streamSettings, update, ['network']);
    const security = useField<string>(streamSettings, update, ['security']);

    const httpupgradePath = useField<string>(streamSettings, update, ['httpupgradeSettings', 'path']);
    const httpupgradeHost = useField<string>(streamSettings, update, ['httpupgradeSettings', 'host']);

    const tcpAcceptProxyProtocol = useField<boolean>(streamSettings, update, ['tcpSettings', 'acceptProxyProtocol']);
    const tcpHeaderType = useField<string>(streamSettings, update, ['tcpSettings', 'header', 'type']);
    const tcpHeaderPath = useField<string[]>(streamSettings, update, ['tcpSettings', 'header', 'request', 'path']);
    const tcpHeaderHost = useField<string[]>(streamSettings, update, ['tcpSettings', 'header', 'request', 'headers', 'Host']);

    const wsAcceptProxyProtocol = useField<boolean>(streamSettings, update, ['wsSettings', 'acceptProxyProtocol']);
    const wsPath = useField<string>(streamSettings, update, ['wsSettings', 'path']);
    const wsHost = useField<string>(streamSettings, update, ['wsSettings', 'headers', 'Host']);
    const wsHeartbeatPeriod = useField<number | undefined>(streamSettings, update, ['wsSettings', 'heartbeatPeriod']);

    const grpcMultiMode = useField<boolean>(streamSettings, update, ['grpcSettings', 'multiMode']);
    const grpcPermitWithoutStream = useField<boolean>(streamSettings, update, ['grpcSettings', 'permit_without_stream']);
    const grpcServiceName = useField<string>(streamSettings, update, ['grpcSettings', 'serviceName']);
    const grpcAuthority = useField<string>(streamSettings, update, ['grpcSettings', 'authority']);
    const grpcUserAgent = useField<string>(streamSettings, update, ['grpcSettings', 'user_agent']);
    const grpcIdleTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'idle_timeout']);
    const grpcHealthCheckTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'health_check_timeout']);
    const grpcInitialWindowsSize = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'initial_windows_size']);

    const kcpCongestion = useField<boolean>(streamSettings, update, ['kcpSettings', 'congestion']);
    const kcpHeaderType = useField<string>(streamSettings, update, ['kcpSettings', 'header', 'type']);
    const kcpSeed = useField<string>(streamSettings, update, ['kcpSettings', 'seed']);
    const kcpMtu = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'mtu']);
    const kcpTti = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'tti']);
    const kcpUplinkCapacity = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'uplinkCapacity']);
    const kcpDownlinkCapacity = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'downlinkCapacity']);
    const kcpReadBufferSize = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'readBufferSize']);
    const kcpWriteBufferSize = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'writeBufferSize']);

    const quicSecurity = useField<string>(streamSettings, update, ['quicSettings', 'security']);
    const quicHeaderType = useField<string>(streamSettings, update, ['quicSettings', 'header', 'type']);
    const quicKey = useField<string>(streamSettings, update, ['quicSettings', 'key']);

    const realitySettings = useField<any>(streamSettings, update, ['realitySettings']);
    const tlsSettings = useField<any>(streamSettings, update, ['tlsSettings']);
    // certificates is always written as a single-element array (server cert +
    // key), so it's bound as one leaf field rather than useArrayField's
    // CRUD-list semantics (which would preserve any extra elements instead of
    // collapsing to one, changing behavior for hand-edited multi-cert JSON).
    const tlsCertificates = useField<any[]>(streamSettings, update, ['tlsSettings', 'certificates']);

    return {
        update,
        network,
        security,
        httpupgradePath,
        httpupgradeHost,
        tcpAcceptProxyProtocol,
        tcpHeaderType,
        tcpHeaderPath,
        tcpHeaderHost,
        wsAcceptProxyProtocol,
        wsPath,
        wsHost,
        wsHeartbeatPeriod,
        grpcMultiMode,
        grpcPermitWithoutStream,
        grpcServiceName,
        grpcAuthority,
        grpcUserAgent,
        grpcIdleTimeout,
        grpcHealthCheckTimeout,
        grpcInitialWindowsSize,
        kcpCongestion,
        kcpHeaderType,
        kcpSeed,
        kcpMtu,
        kcpTti,
        kcpUplinkCapacity,
        kcpDownlinkCapacity,
        kcpReadBufferSize,
        kcpWriteBufferSize,
        quicSecurity,
        quicHeaderType,
        quicKey,
        realitySettings,
        tlsSettings,
        tlsCertificates,
    };
};
