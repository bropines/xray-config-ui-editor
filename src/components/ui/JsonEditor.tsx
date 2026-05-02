import React, { useRef, useEffect, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
         rectSelection, highlightSpecialChars, crosshairCursor,
         lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap, linter, lintGutter } from "@codemirror/lint";
import { jsonLanguage } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import Ajv from "ajv";
import xraySchema from "../../utils/config.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing';
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: JsonEditorProps) => {
    const editorParent = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Подготовка схемы
    const schemaForMode = useMemo(() => {
        if (schemaMode === 'full') return xraySchema;
        let refPath = "";
        switch (schemaMode) {
            case 'inbound': refPath = "InboundObject"; break;
            case 'outbound': refPath = "OutboundObject"; break;
            case 'rule': refPath = "RoutingRule"; break;
            case 'routing': refPath = "RoutingObject"; break;
            case 'dns': refPath = "DnsObject"; break;
            case 'balancer': refPath = "BalancerObject"; break;
            case 'inbounds': return { ...xraySchema, $ref: undefined, type: "array", items: { $ref: "#/definitions/InboundObject" } };
            case 'outbounds': return { ...xraySchema, $ref: undefined, type: "array", items: { $ref: "#/definitions/OutboundObject" } };
            default: return xraySchema;
        }
        return { ...xraySchema, $ref: `#/definitions/${refPath}` };
    }, [schemaMode]);

    // Единый линтер (синтаксис + схема)
    const customLinter = useMemo(() => {
        const validate = ajv.compile(schemaForMode);
        return linter((view) => {
            const diagnostics: any[] = [];
            const doc = view.state.doc.toString();
            if (!doc.trim()) return [];

            try {
                const cleanJson = doc.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => group1 || "");
                const parsed = JSON.parse(cleanJson);
                const valid = validate(parsed);

                if (!valid && validate.errors) {
                    validate.errors.forEach(err => {
                        diagnostics.push({
                            from: 0, to: view.state.doc.length,
                            severity: "error",
                            message: `Schema: ${err.instancePath} ${err.message}`,
                        });
                    });
                }
            } catch (e: any) {
                diagnostics.push({
                    from: 0, to: view.state.doc.length,
                    severity: "error",
                    message: e.message || "Invalid JSON syntax",
                });
            }
            return diagnostics;
        });
    }, [schemaForMode]);

    useEffect(() => {
        if (!editorParent.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
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
                autocompletion(),
                rectSelection(),
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
                jsonLanguage, // Только язык, без встроенных линтеров
                oneDark,
                lintGutter(),
                customLinter,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
                EditorView.editable.of(!readOnly),
                EditorState.readOnly.of(readOnly)
            ]
        });

        const view = new EditorView({
            state,
            parent: editorParent.current
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, [schemaMode, readOnly]); // Пересоздаем только при смене схемы или прав доступа

    // Синхронизация значения извне (если нужно)
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
            className="h-full w-full bg-[#282c34] overflow-hidden flex flex-col font-mono text-[13px] border border-slate-700 rounded-lg"
        >
            <style>{`
                .cm-editor { height: 100% !important; outline: none !important; }
                .cm-scroller { font-family: 'JetBrains Mono', monospace !important; }
                .cm-content { padding-bottom: 100px !important; }
                .cm-gutterElement { font-size: 11px; opacity: 0.5; }
            `}</style>
        </div>
    );
};