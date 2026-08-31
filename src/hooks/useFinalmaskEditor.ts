/**
 * Business logic for FinalmaskEditor: layer-type defaults and the
 * enable/toggle, add/remove/change-type, per-layer setting updater, and
 * QUIC-params updater for the TCP/UDP obfuscation chains. Extracted out of
 * FinalmaskEditor.tsx (RuleEditor-style) so that component is left as pure
 * JSX composition — `finalmask` is a whole-object value and `onChange`
 * replaces it wholesale (no store path), so this does not fit the
 * path-based useField/useArrayField model.
 */

export const FINALMASK_LAYER_TYPES = [
    "noise", "header-custom", "header-dns", "header-dtls", "header-srtp",
    "header-utp", "header-wechat", "header-wireguard", "mkcp-original",
    "mkcp-aes128gcm", "salamander", "sudoku", "xdns", "xicmp"
];

export type FinalmaskNetType = 'tcp' | 'udp';

export function useFinalmaskEditor(finalmask: any, onChange: (v: any) => void) {
    const enabled = !!finalmask;

    const getDefaultSettings = (newType: string) => {
        if (newType === 'noise') return { noise: [{ rand: "40-70", delay: "5-10" }] };
        if (['salamander', 'mkcp-aes128gcm', 'sudoku'].includes(newType)) return { password: "" };
        if (['header-dns', 'xdns'].includes(newType)) return { domain: "" };
        if (newType === 'xicmp') return { listenIp: "0.0.0.0", id: 0 };
        return {};
    };

    const toggle = () => {
        if (enabled) {
            onChange(null);
        } else {
            onChange({ udp: [], tcp: [], quicParams: {} });
        }
    };

    const addLayer = (netType: FinalmaskNetType) => {
        const current = finalmask[netType] || [];
        onChange({ ...finalmask, [netType]: [...current, { type: "noise", settings: getDefaultSettings("noise") }] });
    };

    const removeLayer = (netType: FinalmaskNetType, index: number) => {
        const current = [...(finalmask[netType] || [])];
        current.splice(index, 1);
        onChange({ ...finalmask, [netType]: current });
    };

    const changeType = (netType: FinalmaskNetType, index: number, newType: string) => {
        const current = [...(finalmask[netType] || [])];
        current[index] = { type: newType, settings: getDefaultSettings(newType) };
        onChange({ ...finalmask, [netType]: current });
    };

    const updateSetting = (netType: FinalmaskNetType, index: number, field: string, val: any) => {
        const current = [...(finalmask[netType] || [])];
        current[index] = { ...current[index], settings: { ...current[index].settings, [field]: val } };
        onChange({ ...finalmask, [netType]: current });
    };

    const updateQuic = (field: string, val: any) => {
        const quicParams = { ...(finalmask?.quicParams || {}), [field]: val };
        onChange({ ...finalmask, quicParams });
    };

    return {
        enabled,
        toggle,
        getDefaultSettings,
        addLayer,
        removeLayer,
        changeType,
        updateSetting,
        updateQuic,
    };
}
