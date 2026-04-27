import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import xraySchema from "../../utils/config.schema.json";

interface MobileJsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    schemaMode?: string;
}

export const MobileJsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: MobileJsonEditorProps) => {
    
    // Упрощенный автокомплит на основе схемы
    const schemaCompletions = (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;

        // Извлекаем ключи из определений схемы для подсказок
        const keys = new Set<string>();
        
        // Базовые ключи верхнего уровня
        if (schemaMode === 'full') {
            ['log', 'api', 'dns', 'routing', 'inbounds', 'outbounds', 'stats', 'reverse'].forEach(k => keys.add(k));
        }

        // Ключи инбаундов/аутбаундов
        if (schemaMode?.includes('inbound') || schemaMode === 'full') {
            ['tag', 'port', 'listen', 'protocol', 'settings', 'streamSettings', 'sniffing'].forEach(k => keys.add(k));
        }
        
        if (schemaMode?.includes('outbound') || schemaMode === 'full') {
            ['tag', 'sendThrough', 'protocol', 'settings', 'streamSettings', 'proxySettings', 'mux'].forEach(k => keys.add(k));
        }

        return {
            from: word.from,
            options: Array.from(keys).map(key => ({
                label: key,
                type: "property",
                apply: `"${key}": `
            }))
        };
    };

    return (
        <div className="h-full w-full bg-[#282c34] overflow-hidden flex flex-col">
            <CodeMirror
                value={value}
                height="100%"
                theme={oneDark}
                extensions={[
                    json(),
                    autocompletion({ override: [schemaCompletions] })
                ]}
                onChange={(val) => onChange(val)}
                readOnly={readOnly}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    syntaxHighlighting: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                }}
                className="flex-1 min-h-0 text-[11px] md:text-sm font-mono"
            />
            <style>{`
                .cm-editor { height: 100% !important; }
                .cm-scroller { 
                    font-family: 'JetBrains Mono', monospace !important; 
                    overflow: auto !important;
                }
                .cm-content { padding-bottom: 50px !important; }
            `}</style>
        </div>
    );
};
