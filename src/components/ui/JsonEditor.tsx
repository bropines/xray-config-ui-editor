import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import xraySchema from "../../utils/config.schema.json";

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'outbound' | 'rule' | 'dns' | 'balancer' | 'routing'; 
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: JsonEditorProps) => {
    const editorRef = useRef<any>(null);

    const handleEditorWillMount = (monaco: any) => {
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
                // 2. МАССИВ Inbounds (для модалки секции)
                {
                    uri: "xray://schemas/inbounds.json",
                    fileMatch: ["/inbounds.json"],
                    schema: {
                        "type": "array",
                        "items": { "$ref": "xray://schemas/config.json#/definitions/InboundObject" },
                        "definitions": commonDefinitions
                    }
                },
                // 3. МАССИВ Outbounds (для модалки секции)
                {
                    uri: "xray://schemas/outbounds.json",
                    fileMatch: ["/outbounds.json"],
                    schema: {
                        "type": "array",
                        "items": { "$ref": "xray://schemas/config.json#/definitions/OutboundObject" },
                        "definitions": commonDefinitions
                    }
                },
                // 4. Одиночное правило (для RuleEditor внутри менеджера)
                {
                    uri: "xray://schemas/rule.json",
                    fileMatch: ["/rule.json"],
                    schema: {
                        "$ref": "xray://schemas/config.json#/definitions/RoutingRule",
                        "definitions": commonDefinitions
                    }
                },
                // 5. Весь объект Routing (для модалки секции)
                {
                    uri: "xray://schemas/routing.json",
                    fileMatch: ["/routing.json"],
                    schema: {
                        "$ref": "xray://schemas/config.json#/definitions/RoutingObject",
                        "definitions": commonDefinitions
                    }
                },
                // 6. Весь объект DNS
                {
                    uri: "xray://schemas/dns.json",
                    fileMatch: ["/dns.json"],
                    schema: {
                        "$ref": "xray://schemas/config.json#/definitions/DnsObject",
                        "definitions": commonDefinitions
                    }
                },
                // 7. Одиночный Balancer
                {
                    uri: "xray://schemas/balancer.json",
                    fileMatch: ["/balancer.json"],
                    schema: {
                        "$ref": "xray://schemas/config.json#/definitions/BalancerObject",
                        "definitions": commonDefinitions
                    }
                }
            ],
        });
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => editor.layout());
        }
    };

    const getFilePath = () => {
        switch(schemaMode) {
            case 'inbound': return '/inbounds.json';
            case 'outbound': return '/outbounds.json';
            case 'rule': return '/rule.json';
            case 'routing': return '/routing.json';
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
                path={getFilePath()}
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
        </div>
    );
};