import React from "react";
import { t } from '../../i18n';
import type { JsonEditorProps } from "./JsonEditorView";

const JsonEditorView = React.lazy(() =>
    import("./JsonEditorView").then(module => ({ default: module.JsonEditorView })));

/**
 * CodeMirror, fetched the first time someone opens a JSON view.
 *
 * It is the largest dependency here — 417 kB of editor, grammars and lint
 * machinery — and nothing shows it until a JSON mode is switched on, which
 * most sessions never do. Splitting it at this boundary rather than at each
 * of the eight call sites means every one of them gets it for free.
 */
export const JsonEditor = (props: JsonEditorProps) => (
    <React.Suspense
        fallback={
            <div className="w-full h-full min-h-[120px] flex items-center justify-center bg-[#1e1e1e] rounded-lg text-slate-500 text-xs">
                {t("Loading editor…")}
            </div>
        }
    >
        <JsonEditorView {...props} />
    </React.Suspense>
);
