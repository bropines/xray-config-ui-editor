import React, { useMemo } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter } from '@codemirror/lint';
import { autocompletion } from '@codemirror/autocomplete';
import xraySchema from "../../utils/config.schema.json";

// Ajv для валидации JSON схемы в CodeMirror
import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true, strict: false });

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing';
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: JsonEditorProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Определяем подсхему в зависимости от режима, сохраняя контекст определений
    const schemaForMode = useMemo(() => {
        // Если это полный конфиг, возвращаем всю схему
        if (schemaMode === 'full') return xraySchema;
        
        // Для отдельных частей конфига создаем виртуальную схему, 
        // которая ссылается на определения в основной схеме.
        // Это необходимо, чтобы Ajv мог разрешить ссылки типа #/definitions/StreamSettingsObject
        let refPath = "";
        switch (schemaMode) {
            case 'inbound': refPath = "InboundObject"; break;
            case 'outbound': refPath = "OutboundObject"; break;
            case 'rule': refPath = "RoutingRule"; break;
            case 'routing': refPath = "RoutingObject"; break;
            case 'dns': refPath = "DnsObject"; break;
            case 'balancer': refPath = "BalancerObject"; break;
            case 'inbounds': 
                return { 
                    ...xraySchema, 
                    $ref: undefined, 
                    type: "array", 
                    items: { $ref: "#/definitions/InboundObject" } 
                };
            case 'outbounds': 
                return { 
                    ...xraySchema, 
                    $ref: undefined, 
                    type: "array", 
                    items: { $ref: "#/definitions/OutboundObject" } 
                };
            default: return xraySchema;
        }

        return {
            ...xraySchema,
            $ref: `#/definitions/${refPath}`
        };
    }, [schemaMode]);

    // Кастомный линтер на основе нашей JSON-схемы
    const schemaLinter = useMemo(() => {
        const validate = ajv.compile(schemaForMode);
        
        return linter((view) => {
            const diagnostics: any[] = [];
            const doc = view.state.doc.toString();
            if (!doc.trim()) return [];

            try {
                // Убираем комментарии перед валидацией (Xray их поддерживает, JSON.parse - нет)
                const cleanJson = doc.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => group1 || "");
                const parsed = JSON.parse(cleanJson);
                const valid = validate(parsed);

                if (!valid && validate.errors) {
                    validate.errors.forEach(err => {
                        diagnostics.push({
                            from: 0,
                            to: view.state.doc.length,
                            severity: "error",
                            message: `Schema: ${err.instancePath} ${err.message}`,
                        });
                    });
                }
            } catch (e: any) {
                // Ошибки синтаксиса обработает стандартный jsonParseLinter
            }
            return diagnostics;
        });
    }, [schemaForMode]);

    return (
        <div className="h-full w-full bg-[#282c34] overflow-hidden flex flex-col font-mono text-[13px]">
            <CodeMirror
                value={value}
                height="100%"
                theme={oneDark}
                extensions={[
                    json(),
                    lintGutter(),
                    jsonParseLinter(),
                    schemaLinter,
                    autocompletion()
                ]}
                onChange={onChange}
                readOnly={readOnly}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    syntaxHighlighting: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                }}
                className="flex-1 min-h-0"
            />
            <style>{`
                .cm-editor { height: 100% !important; }
                .cm-scroller { 
                    font-family: 'JetBrains Mono', monospace !important;
                }
                .cm-content { padding-bottom: 100px !important; }
                .cm-gutterElement { font-size: 11px; opacity: 0.5; }
                /* Стили для тултипов ошибок */
                .cm-tooltip-lint { background: #1e293b !important; border: 1px solid #475569 !important; color: #f1f5f9 !important; }
            `}</style>
        </div>
    );
};