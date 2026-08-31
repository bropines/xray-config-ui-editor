/**
 * Business logic for XhttpSettingsEditor: the generic path-based deep-clone
 * updater plus the derived `extra`/`xmux` sub-objects it reads from.
 * Extracted out of XhttpSettingsEditor.tsx (RuleEditor-style) —
 * `xhttpSettings` is a whole-object value and `onChange` replaces it
 * wholesale (no store path), so this does not fit the path-based
 * useField/useArrayField model. UI-only view-state (which collapsible
 * sections are open) stays local to the component, same as RuleEditor
 * keeps its own local view state alongside useRuleEditor.
 */
export function useXhttpSettingsEditor(xhttpSettings: any, onChange: (v: any) => void) {
    const update = (path: string[], value: any) => {
        const newObj = JSON.parse(JSON.stringify(xhttpSettings));
        let curr = newObj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i]!;
            if (!curr[key]) curr[key] = {};
            curr = curr[key];
        }

        const lastKey = path[path.length - 1]!;
        if (value === "" || value === undefined || value === null) {
            delete curr[lastKey];
        } else {
            curr[lastKey] = value;
        }
        onChange(newObj);
    };

    const extra = xhttpSettings.extra || {};
    const xmux = extra.xmux || {};

    return { update, extra, xmux };
}
