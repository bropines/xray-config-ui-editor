import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import xraySchema from "../../utils/config.schema.json";

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'outbound' | 'rule' | 'dns' | 'balancer'; // Новый проп
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: JsonEditorProps) => {
    const editorRef = useRef<any>(null);

    const handleEditorWillMount = (monaco: any) => {
        // Мы передаем definitions во все подсхемы, чтобы $ref работали
        const commonDefinitions = xraySchema.definitions;

        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            schemas: [
                // 1. Полный конфиг
                {
                    uri: "xray://schemas/config.json",
                    fileMatch: ["/config.json"], 
                    schema: xraySchema,
                },
                // 2. Отдельный Inbound
                {
                    uri: "xray://schemas/inbound.json",
                    fileMatch: ["/inbound.json"],
                    schema: {
                        "$ref": "#/definitions/InboundObject",
                        "definitions": commonDefinitions
                    }
                },
                // 3. Отдельный Outbound
                {
                    uri: "xray://schemas/outbound.json",
                    fileMatch: ["/outbound.json"],
                    schema: {
                        "$ref": "#/definitions/OutboundObject",
                        "definitions": commonDefinitions
                    }
                },
                // 4. Routing Rule (Правило)
                {
                    uri: "xray://schemas/rule.json",
                    fileMatch: ["/rule.json"],
                    schema: {
                        "$ref": "#/definitions/RoutingRule",
                        "definitions": commonDefinitions
                    }
                },
                 // 5. DNS
                 {
                    uri: "xray://schemas/dns.json",
                    fileMatch: ["/dns.json"],
                    schema: {
                        "$ref": "#/definitions/DnsObject",
                        "definitions": commonDefinitions
                    }
                },
                 // 6. Balancer
                 {
                    uri: "xray://schemas/balancer.json",
                    fileMatch: ["/balancer.json"],
                    schema: {
                        "$ref": "#/definitions/BalancerObject",
                        "definitions": commonDefinitions
                    }
                }
            ],
        });
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setTimeout(() => editor.layout(), 100);
    };

    // Определяем имя "виртуального файла" на основе режима
    const getFilePath = () => {
        switch(schemaMode) {
            case 'inbound': return '/inbound.json';
            case 'outbound': return '/outbound.json';
            case 'rule': return '/rule.json';
            case 'dns': return '/dns.json';
            case 'balancer': return '/balancer.json';
            default: return '/config.json';
        }
    };

    return (
        <div className="h-full w-full border border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e] monaco-editor-container" 
             style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Editor
                height="100%"
                path={getFilePath()} // <--- МАГИЯ ЗДЕСЬ: Monaco подберет схему по имени файла
                defaultLanguage="json"
                theme="vs-dark"
                value={value}
                onChange={onChange}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                    lineHeight: 20,
                    fixedOverflowWidgets: true,
                }}
            />
            <style>{`
                .monaco-editor-container .monaco-editor .view-line {
                    line-height: 20px !important;
                }
                .monaco-editor .decorationsOverviewRuler {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};