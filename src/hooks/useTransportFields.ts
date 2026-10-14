import { useField, type FieldPath } from './useField';

/** Header names the core treats as Host: it lower-cases before comparing. */
const isHostHeader = (name: string) => name.toLowerCase() === 'host';

/**
 * Binds a transport editor to one `streamSettings` object.
 *
 * Every path below is the ONE place the wiring lives; the markup that reads
 * these is free to be rearranged without touching any of it. `streamSettings`
 * plays the role of an editor's `local` state and `update` the role of its
 * `updateField(path, value)` — the same shape `useXrayEditor` exposes, scoped
 * to this one sub-object (see InboundClients.tsx for the same pattern against
 * the full editor state).
 */
export const useTransportFields = (streamSettings: any, onChange: (next: any) => void) => {
    const clone = () => JSON.parse(JSON.stringify(streamSettings ?? {}));

    /** Walks to the parent of `path`, creating objects on the way. */
    const parentOf = (root: any, path: (string | number)[]) => {
        let curr = root;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i]!;
            if (!curr[key] || typeof curr[key] !== 'object') curr[key] = {};
            curr = curr[key];
        }
        return curr;
    };

    const asPath = (path: FieldPath) => (Array.isArray(path) ? path : [path]);

    const update = (path: FieldPath, value: any) => {
        const pathArr = asPath(path);
        const leaf = pathArr[pathArr.length - 1];
        if (leaf === undefined) return;
        const next = clone();
        parentOf(next, pathArr)[leaf] = value;
        onChange(next);
    };

    /**
     * Same, but an emptied field removes its key instead of writing `""` or
     * `undefined`. For the fields added with the version work: a key that
     * some line refuses or ignores should not linger as an empty string.
     */
    const updateOrDelete = (path: FieldPath, value: any) => {
        const pathArr = asPath(path);
        const leaf = pathArr[pathArr.length - 1];
        if (leaf === undefined) return;
        const next = clone();
        const parent = parentOf(next, pathArr);
        if (value === undefined || value === '' || value === null) delete parent[leaf];
        else parent[leaf] = value;
        onChange(next);
    };

    /** Drops keys from the object at `path`; what is left stays. */
    const removeKeys = (path: string[], keys: string[]) => {
        const next = clone();
        let target = next;
        for (const key of path) {
            if (!target?.[key] || typeof target[key] !== 'object') return;
            target = target[key];
        }
        for (const key of keys) delete target[key];
        onChange(next);
    };

    // ── network / security ──────────────────────────────────────────────
    const network = useField<string>(streamSettings, update, ['network']);
    const security = useField<string>(streamSettings, update, ['security']);
    /**
     * Picking a network also drops `method`. 26.7 reads `method` over
     * `network` when both are there, so a choice made here would otherwise do
     * nothing on 26.7+ for a config that carries one.
     */
    const setNetwork = (value: string) => {
        const next = clone();
        next.network = value;
        delete next.method;
        onChange(next);
    };
    /** `method` → `network`, keeping what 26.7+ already did with it. */
    const foldMethodIntoNetwork = () => {
        if (typeof streamSettings?.method !== 'string') return;
        setNetwork(streamSettings.method);
    };

    const httpupgradePath = useField<string>(streamSettings, update, ['httpupgradeSettings', 'path']);
    const httpupgradeHost = useField<string>(streamSettings, update, ['httpupgradeSettings', 'host']);

    // `rawSettings` and `tcpSettings` are one object to the core, and when a
    // config has both, rawSettings wins (v26.7.28:infra/conf/transport_internet.go:120).
    // Editing whichever one it already reads is the only edit that counts.
    const rawKey = streamSettings?.rawSettings ? 'rawSettings' : 'tcpSettings';
    const tcpAcceptProxyProtocol = useField<boolean>(streamSettings, update, [rawKey, 'acceptProxyProtocol']);
    const tcpHeaderType = useField<string>(streamSettings, update, [rawKey, 'header', 'type']);
    const tcpHeaderPath = useField<string[]>(streamSettings, update, [rawKey, 'header', 'request', 'path']);
    const tcpHeaderHost = useField<string[]>(streamSettings, update, [rawKey, 'header', 'request', 'headers', 'Host']);

    const wsAcceptProxyProtocol = useField<boolean>(streamSettings, update, ['wsSettings', 'acceptProxyProtocol']);
    const wsPath = useField<string>(streamSettings, update, ['wsSettings', 'path']);
    /**
     * The WebSocket host lives in `wsSettings.host`. A Host entry in
     * `headers` — which is where this editor used to write it — still works,
     * but every line logs it as deprecated and moves it over
     * (v26.7.28:infra/conf/transport_method.go:637). Read from either, write
     * to the field, and clear the header so the two cannot disagree.
     */
    const wsHeaders: Record<string, string> = streamSettings?.wsSettings?.headers ?? {};
    const wsHeaderHost = Object.entries(wsHeaders).find(([name]) => isHostHeader(name))?.[1];
    const wsHost = {
        value: (streamSettings?.wsSettings?.host as string | undefined) || wsHeaderHost,
        onChange: (value: string) => {
            const next = clone();
            const ws = parentOf(next, ['wsSettings', 'host']);
            if (value) ws.host = value;
            else delete ws.host;
            if (ws.headers && typeof ws.headers === 'object') {
                for (const name of Object.keys(ws.headers)) if (isHostHeader(name)) delete ws.headers[name];
                if (Object.keys(ws.headers).length === 0) delete ws.headers;
            }
            onChange(next);
        },
    };
    const wsHeartbeatPeriod = useField<number | undefined>(streamSettings, update, ['wsSettings', 'heartbeatPeriod']);

    const grpcMultiMode = useField<boolean>(streamSettings, update, ['grpcSettings', 'multiMode']);
    const grpcPermitWithoutStream = useField<boolean>(streamSettings, update, ['grpcSettings', 'permit_without_stream']);
    const grpcServiceName = useField<string>(streamSettings, update, ['grpcSettings', 'serviceName']);
    const grpcAuthority = useField<string>(streamSettings, update, ['grpcSettings', 'authority']);
    const grpcUserAgent = useField<string>(streamSettings, update, ['grpcSettings', 'user_agent']);
    const grpcIdleTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'idle_timeout']);
    const grpcHealthCheckTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'health_check_timeout']);
    const grpcInitialWindowsSize = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'initial_windows_size']);

    // mKCP. `header` and `seed` have no binding on purpose: 26.3 and 26.7
    // refuse the config when either key exists — see KCP_RETIRED_KEYS.
    const kcpMtu = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'mtu']);
    const kcpTti = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'tti']);
    const kcpUplinkCapacity = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'uplinkCapacity']);
    const kcpDownlinkCapacity = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'downlinkCapacity']);
    // 26.3 only.
    const kcpCongestion = useField<boolean | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'congestion']);
    const kcpReadBufferSize = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'readBufferSize']);
    const kcpWriteBufferSize = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'writeBufferSize']);
    // 26.7 and later.
    const kcpMaxSendingWindow = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'maxSendingWindow']);
    const kcpCwndMultiplier = useField<number | undefined>(streamSettings, updateOrDelete, ['kcpSettings', 'cwndMultiplier']);
    const removeKcpKeys = (keys: string[]) => removeKeys(['kcpSettings'], keys);

    /**
     * Hysteria. `version` must be exactly 2 whenever the object exists — the
     * core refuses anything else, including a missing one
     * (v26.7.28:infra/conf/transport_method.go:776) — so every write stamps
     * it rather than leaving it to a field nobody would think to fill in.
     */
    const updateHysteria = (path: FieldPath, value: any) => {
        const pathArr = asPath(path);
        const leaf = pathArr[pathArr.length - 1];
        if (leaf === undefined) return;
        const next = clone();
        const parent = parentOf(next, pathArr);
        if (value === undefined || value === '' || value === null || value === false) delete parent[leaf];
        else parent[leaf] = value;
        next.hysteriaSettings = { ...next.hysteriaSettings, version: 2 };
        onChange(next);
    };
    const hysteriaVersion = useField<number | undefined>(streamSettings, update, ['hysteriaSettings', 'version']);
    const hysteriaAuth = useField<string>(streamSettings, updateHysteria, ['hysteriaSettings', 'auth']);
    const hysteriaUdpIdleTimeout = useField<number | undefined>(streamSettings, updateHysteria, ['hysteriaSettings', 'udpIdleTimeout']);
    const masqueradeType = useField<string>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'type']);
    const masqueradeDir = useField<string>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'dir']);
    const masqueradeUrl = useField<string>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'url']);
    const masqueradeRewriteHost = useField<boolean>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'rewriteHost']);
    const masqueradeInsecure = useField<boolean>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'insecure']);
    const masqueradeXForwarded = useField<boolean>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'xForwarded']);
    const masqueradeContent = useField<string>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'content']);
    const masqueradeStatusCode = useField<number | undefined>(streamSettings, updateHysteria, ['hysteriaSettings', 'masquerade', 'statusCode']);
    const setHysteriaVersion = () => updateHysteria(['hysteriaSettings', 'version'], 2);
    const removeHysteriaKeys = (keys: string[]) => removeKeys(['hysteriaSettings'], keys);

    // xhttpSettings and splithttpSettings are one object, and xhttpSettings
    // wins when both are there (v26.7.28:infra/conf/transport_internet.go:133):
    // edit the one the core reads.
    const xhttpKey = streamSettings?.xhttpSettings || !streamSettings?.splithttpSettings ? 'xhttpSettings' : 'splithttpSettings';
    const xhttpSettings = useField<any>(streamSettings, update, [xhttpKey]);

    // masqueSettings is one object the editor rebuilds whole, so an emptied one
    // goes (an undefined key would linger in the in-memory config).
    const masqueSettings = {
        ...useField<any>(streamSettings, update, ['masqueSettings']),
        onChange: (next: unknown) => (next === undefined ? removeKeys([], ['masqueSettings']) : update(['masqueSettings'], next)),
    };

    const realitySettings = useField<any>(streamSettings, update, ['realitySettings']);
    const tlsSettings = useField<any>(streamSettings, update, ['tlsSettings']);
    // certificates is always written as a single-element array (server cert +
    // key), so it's bound as one leaf field rather than useArrayField's
    // CRUD-list semantics (which would preserve any extra elements instead of
    // collapsing to one, changing behavior for hand-edited multi-cert JSON).
    const tlsCertificates = useField<any[]>(streamSettings, update, ['tlsSettings', 'certificates']);
    const removeTlsKeys = (keys: string[]) => removeKeys(['tlsSettings'], keys);
    const removeStreamKeys = (keys: string[]) => removeKeys([], keys);

    return {
        update,
        network,
        setNetwork,
        foldMethodIntoNetwork,
        removeStreamKeys,
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
        kcpMtu,
        kcpTti,
        kcpUplinkCapacity,
        kcpDownlinkCapacity,
        kcpCongestion,
        kcpReadBufferSize,
        kcpWriteBufferSize,
        kcpMaxSendingWindow,
        kcpCwndMultiplier,
        removeKcpKeys,
        hysteriaVersion,
        hysteriaAuth,
        hysteriaUdpIdleTimeout,
        masqueradeType,
        masqueradeDir,
        masqueradeUrl,
        masqueradeRewriteHost,
        masqueradeInsecure,
        masqueradeXForwarded,
        masqueradeContent,
        masqueradeStatusCode,
        setHysteriaVersion,
        removeHysteriaKeys,
        xhttpSettings,
        masqueSettings,
        realitySettings,
        tlsSettings,
        tlsCertificates,
        removeTlsKeys,
    };
};
