/**
 * Business logic for SockoptEditor: the local-value fallback, the
 * clear-empty-value field updater, add/remove toggle handlers, and the
 * derived "has any extended value" flag used by the ExtendedSection
 * summary. Extracted out of SockoptEditor.tsx (RuleEditor-style) —
 * `sockopt` is a whole-object value and `onChange` replaces it wholesale
 * (no store path), so this does not fit the path-based
 * useField/useArrayField model.
 */
export function useSockoptEditor(sockopt: any, onChange: (v: any) => void) {
    const local = sockopt || {};

    const update = (field: string, val: any) => {
        // Clean empty/NaN values so they don't pollute the JSON output
        if (val === "" || Number.isNaN(val)) {
            const newObj = { ...local };
            delete newObj[field];
            onChange(newObj);
        } else {
            onChange({ ...local, [field]: val });
        }
    };

    const add = () => onChange({});
    const remove = () => onChange(null);

    const hasExtendedValues = !!(
        local.happyEyeballs ||
        local.penetrate ||
        local.addressPortStrategy ||
        local.tcpKeepAliveIdle ||
        local.tcpKeepAliveInterval ||
        local.tcpUserTimeout ||
        local.tcpMaxSeg ||
        local.tcpCongestion ||
        local.tcpWindowClamp
    );

    return { local, update, add, remove, hasExtendedValues };
}
