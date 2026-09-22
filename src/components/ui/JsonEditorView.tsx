import React, { useRef, useEffect, useMemo } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
         rectangularSelection, highlightSpecialChars, crosshairCursor,
         lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, syntaxTree } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap, linter, lintGutter } from "@codemirror/lint";
import { jsonc, jsoncLanguage } from "@platformos/lang-jsonc";
import { oneDark } from "@codemirror/theme-one-dark";


import { parseJsonc } from "../../utils/jsonc";
import { lintValue, type LintMode } from "../../core/xray/json-lint";
import { rangeAtPath, contextAt, stringAt } from "../../core/xray/json-positions";
import { fieldsAt, valuesAt } from "../../core/xray/schema-walk";
import { toast } from "sonner";
import { t } from '../../i18n';


export interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse';
    mode?: 'json' | 'plaintext';
    /**
     * Ctrl+S handler — called (in addition to onChange, which always fires
     * first) so the caller can decide what "save" means here: writing to
     * the active profile, updating local component state, or nothing at
     * all. JsonEditor itself has no opinion on persistence.
     */
    onSaveShortcut?: () => void;
    /**
     * Ctrl+Shift+S handler — same idea for "commit a version snapshot".
     * Return the created snapshot (or null if nothing changed) so the
     * success/info toast text stays accurate; return undefined to skip
     * that toast entirely (e.g. when the caller doesn't support commits).
     */
    onCommitShortcut?: () => { id: string; additions?: number; deletions?: number } | null | undefined;
}

export const JsonEditorView = ({ value, onChange, readOnly = false, schemaMode = 'full', mode = 'json', onSaveShortcut, onCommitShortcut }: JsonEditorProps) => {
    const editorParent = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // The view is built once and kept; anything it closes over would freeze
    // at mount. Reading the callbacks through a box that every render
    // refreshes is what keeps the editor writing into current state instead
    // of the one that existed when it opened.
    const latest = useRef({ value, onChange, onSaveShortcut, onCommitShortcut });
    useEffect(() => {
        latest.current = { value, onChange, onSaveShortcut, onCommitShortcut };
    });

    const isJson = mode === 'json';

    // Единый линтер (синтаксис + схема)    // Syntax first, then the schema — see core/xray/json-lint.
    const customLinter = useMemo(() => {
        if (!isJson) return null;
        return linter((view) => {
            const diagnostics: any[] = [];
            const doc = view.state.doc.toString();
            if (!doc.trim()) return [];

            try {
                const parsed = parseJsonc(doc);
                const tree = syntaxTree(view.state);

                for (const issue of lintValue(schemaMode as LintMode, parsed)) {
                    // A path that is not in the text yet — half-typed — has
                    // nowhere to point, so the first character stands in for
                    // the document rather than underlining the whole file.
                    const range = rangeAtPath(doc, issue.path, tree);
                    diagnostics.push({
                        from: range ? range.from : 0,
                        to: range ? range.to : Math.min(1, doc.length),
                        severity: "error",
                        message: issue.message,
                    });
                }
            } catch (e: any) {
                // If user is actively typing a comment (line or word ends with single slash), skip noisy syntax error underline over the /
                const trimmed = doc.trimEnd();
                if (trimmed.endsWith('/') && !trimmed.endsWith('//') && !trimmed.endsWith('*/')) {
                    return [];
                }

                let from = 0;
                let to = view.state.doc.length;
                const posMatch = e.message.match(/position (\d+)/i);
                if (posMatch) {
                    const pos = parseInt(posMatch[1], 10);
                    from = Math.max(0, pos - 1);
                    to = Math.min(view.state.doc.length, pos + 1);
                }
                diagnostics.push({
                    from,
                    to,
                    severity: "error",
                    message: e.message || "Invalid JSON syntax",
                });
            }
            return diagnostics;
        });
    }, [schemaMode, isJson]);

    /**
     * What may be written here.
     *
     * The old version offered the root object's keys at every depth — inside
     * a routing rule it suggested `log` and `inbounds` — because it read one
     * flat list out of the schema and never asked where the cursor was. This
     * asks: the keys of the object being written, or the values the key on
     * the left accepts.
     */
    const customCompletion = useMemo(() => {
        if (!isJson) return null;
        return jsoncLanguage.data.of({
            autocomplete: (context: any) => {
                const tree = syntaxTree(context.state);
                const node = tree.resolveInner(context.pos, -1);
                if (node && node.type.name.includes("Comment")) return null;

                const word = context.matchBefore(/[\w"@.:-]*/);
                if (!word || (word.from === word.to && !context.explicit)) return null;

                const doc = context.state.doc.toString();
                const where = contextAt(doc, context.pos, tree);
                const quoted = doc[word.from] === '"';
                const options: any[] = [];

                // A `settings` block takes its shape from the `protocol`
                // written beside it. Read from the tree rather than by
                // parsing: completion runs on text that is mid-edit, which is
                // exactly the text a parse refuses.
                const protocolAt = (ownerPath: (string | number)[]) =>
                    stringAt(doc, [...ownerPath, 'protocol'], tree) ?? undefined;

                if (where.kind === 'value') {
                    for (const value of valuesAt(schemaMode as LintMode, where.path, protocolAt)) {
                        options.push({
                            label: quoted ? `"${value}"` : value,
                            apply: quoted ? `"${value}"` : `"${value}"`,
                            type: "constant",
                            detail: "value",
                        });
                    }
                } else {
                    // Keys already written are not worth offering again.
                    const parent = tree.resolveInner(context.pos, -1);
                    const taken = new Set<string>();
                    for (let n: any = parent; n; n = n.parent) {
                        if (n.name !== 'Object') continue;
                        for (let child = n.firstChild; child; child = child.nextSibling) {
                            if (child.name !== 'Property') continue;
                            const nameNode = child.firstChild;
                            if (nameNode?.name === 'PropertyName') {
                                taken.add(doc.slice(nameNode.from + 1, nameNode.to - 1));
                            }
                        }
                        break;
                    }

                    for (const field of fieldsAt(schemaMode as LintMode, where.path, protocolAt)) {
                        if (taken.has(field.name)) continue;
                        options.push({
                            label: quoted ? `"${field.name}"` : field.name,
                            apply: `"${field.name}": `,
                            type: "property",
                            detail: field.required ? `${field.type} · required` : field.type,
                            info: field.values ? field.values.join(" | ") : undefined,
                            boost: field.required ? 1 : 0,
                        });
                    }
                }

                if (options.length === 0) return null;
                return { from: word.from, options, filter: true };
            }
        });
    }, [schemaMode, isJson]);

    useEffect(() => {
        if (!editorParent.current) return;

        const extensions = [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap
            ]),
            oneDark,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    latest.current.onChange(update.state.doc.toString());
                }
            }),
            EditorView.editable.of(!readOnly),
            EditorState.readOnly.of(readOnly),
            EditorView.theme({
                "&": { height: "100%", backgroundColor: "#1e1e1e" },
                "&.cm-focused": { outline: "none" },
                ".cm-scroller": {
                    overflow: "auto !important",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#334155 #0f172a",
                    height: "100%",
                    maxHeight: "100%"
                },
                ".cm-scroller::-webkit-scrollbar": {
                    width: "10px",
                    height: "10px"
                },
                ".cm-scroller::-webkit-scrollbar-track": {
                    background: "#0f172a"
                },
                ".cm-scroller::-webkit-scrollbar-thumb": {
                    background: "#334155",
                    borderRadius: "10px",
                    border: "3px solid #0f172a"
                },
                ".cm-scroller::-webkit-scrollbar-thumb:hover": {
                    background: "#475569"
                },
                ".cm-gutters": {
                    backgroundColor: "#1e1e1e",
                    color: "#6b7280",
                    border: "none"
                },
                ".cm-activeLineGutter": {
                    backgroundColor: "#2d3748",
                    color: "#e2e8f0"
                },
                ".cm-tooltip": {
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                },
                ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
                    backgroundColor: "#312e81",
                    color: "white"
                }
            })
        ];

        if (isJson) {
            const hotkeyKeymap = keymap.of([
                {
                    key: "Mod-s",
                    run: (view) => {
                        const currentDoc = view.state.doc.toString();
                        console.log('[JsonEditor] Ctrl+S pressed -> Syncing memory & UI...');
                        latest.current.onChange(currentDoc);
                        if (latest.current.onSaveShortcut) {
                            latest.current.onSaveShortcut();
                            toast.success(t("✓ Saved to memory & UI updated"), { id: 'ctrl-s-toast' });
                        }
                        return true;
                    }
                },
                {
                    key: "Mod-Shift-s",
                    run: (view) => {
                        const currentDoc = view.state.doc.toString();
                        console.log('[JsonEditor] Ctrl+Shift+S pressed -> Creating Git Commit...');
                        latest.current.onChange(currentDoc);
                        latest.current.onSaveShortcut?.();
                        if (latest.current.onCommitShortcut) {
                            const snapshot = latest.current.onCommitShortcut();
                            if (snapshot) {
                                console.log('[JsonEditor] Created snapshot commit:', snapshot);
                                toast.success(`✓ Git Commit: ${snapshot.id.substring(0, 7)} (+${snapshot.additions ?? 0} -${snapshot.deletions ?? 0})`, { id: 'ctrl-shift-s-toast' });
                            } else {
                                console.log('[JsonEditor] Already at HEAD');
                                toast.info(t("Already at HEAD (no changes to commit)"), { id: 'ctrl-shift-s-toast' });
                            }
                        }
                        return true;
                    }
                }
            ]);

            // Ctrl+S/Ctrl+Shift+S save shortcuts don't make sense in a
            // read-only view (e.g. a version-history snapshot preview) —
            // don't wire them there, regardless of whether the caller
            // passed onSaveShortcut/onCommitShortcut.
            extensions.push(
                ...(readOnly ? [] : [hotkeyKeymap]),
                jsonc(),
                autocompletion({
                    defaultKeymap: true,
                    aboveCursor: true,
                    activateOnTyping: true,
                    icons: true
                }),
                customCompletion!,
                lintGutter(),
                customLinter!
            );
        }

        // A phone cannot scroll horizontally past the gutter to read the end
        // of a long value, so a narrow viewport wraps. Desktop keeps one line
        // per line, which is what makes a line number or a lint marker point
        // at something. A compartment rather than a boot-time check, so a
        // rotated phone or a resized window changes its mind.
        const narrow = window.matchMedia('(max-width: 767px)');
        const wrapping = new Compartment();
        extensions.push(wrapping.of(narrow.matches ? EditorView.lineWrapping : []));

        const state = EditorState.create({
            doc: latest.current.value,
            extensions
        });

        const view = new EditorView({
            state,
            parent: editorParent.current
        });

        viewRef.current = view;

        // CodeMirror derives its cursor and selection geometry from one
        // character measured at startup. A web font that arrives afterwards
        // changes that width, so re-measure rather than leave the caret
        // drifting away from the text it is sitting in.
        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) view.requestMeasure();
        }).catch(() => {});

        const syncWrapping = () => view.dispatch({
            effects: wrapping.reconfigure(narrow.matches ? EditorView.lineWrapping : []),
        });
        narrow.addEventListener('change', syncWrapping);

        return () => {
            cancelled = true;
            narrow.removeEventListener('change', syncWrapping);
            view.destroy();
        };
    }, [schemaMode, readOnly, isJson, customLinter, customCompletion]);

    useEffect(() => {
        if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: value }
            });
        }
    }, [value]);

    return (
        <div 
            ref={editorParent} 
            className="h-full w-full bg-[#1e1e1e] overflow-hidden flex flex-col font-mono text-[13px] border border-slate-700 rounded-lg shadow-inner"
        >
            <style>{`
                .cm-editor { height: 100% !important; outline: none !important; font-variant-ligatures: none !important; font-feature-settings: "calt" 0, "liga" 0 !important; }
                .cm-scroller { font-family: var(--font-mono) !important; line-height: 1.5 !important; font-variant-ligatures: none !important; font-feature-settings: "calt" 0, "liga" 0 !important; }
                .cm-content { padding-bottom: 100px !important; font-variant-ligatures: none !important; font-feature-settings: "calt" 0, "liga" 0 !important; }
                .cm-gutterElement { font-size: 11px; opacity: 0.5; }
                /* Исправление отображения ошибок */
                .cm-lintRange-error { 
                    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3">%3Cpath d="M0 3 L3 0 L6 3" fill="none" stroke="%23f87171" stroke-width="1.2"/%3E') !important; 
                    background-position: bottom left !important; 
                    background-repeat: repeat-x !important;
                    padding-bottom: 1px !important;
                }
            `}</style>
        </div>
    );
};