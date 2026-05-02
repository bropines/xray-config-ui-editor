import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import xraySchema from "../../utils/config.schema.json";

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing';
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full' }: JsonEditorProps) => {
    const editorRef = useRef<any>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const handleEditorWillMount = (monaco: any) => {
        const MASTER_SCHEMA_URI = "inmemory://xray/master-config.schema.json";

        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            enableSchemaRequest: false,
            schemas: [
                {
                    uri: MASTER_SCHEMA_URI,
                    schema: xraySchema,
                },
                {
                    uri: "inmemory://xray/config.json",
                    fileMatch: ["/config.json"],
                    schema: { $ref: MASTER_SCHEMA_URI }
                },
                {
                    uri: "inmemory://xray/inbound.json",
                    fileMatch: ["/inbound.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/InboundObject` }
                },
                {
                    uri: "inmemory://xray/outbound.json",
                    fileMatch: ["/outbound.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/OutboundObject` }
                },
                {
                    uri: "inmemory://xray/inbounds.json",
                    fileMatch: ["/inbounds.json"],
                    schema: {
                        type: "array",
                        items: { $ref: `${MASTER_SCHEMA_URI}#/definitions/InboundObject` }
                    }
                },
                {
                    uri: "inmemory://xray/outbounds.json",
                    fileMatch: ["/outbounds.json"],
                    schema: {
                        type: "array",
                        items: { $ref: `${MASTER_SCHEMA_URI}#/definitions/OutboundObject` }
                    }
                },
                {
                    uri: "inmemory://xray/rule.json",
                    fileMatch: ["/rule.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/RoutingRule` }
                },
                {
                    uri: "inmemory://xray/routing.json",
                    fileMatch: ["/routing.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/RoutingObject` }
                },
                {
                    uri: "inmemory://xray/dns.json",
                    fileMatch: ["/dns.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/DnsObject` }
                },
                {
                    uri: "inmemory://xray/balancer.json",
                    fileMatch: ["/balancer.json"],
                    schema: { $ref: `${MASTER_SCHEMA_URI}#/definitions/BalancerObject` }
                }
            ],
        });
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setTimeout(() => editor.layout(), 100);
        
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                editor.layout();
            });
        }
    };

    const getFilePath = () => {
        switch (schemaMode) {
            case 'inbound': return '/inbound.json';
            case 'inbounds': return '/inbounds.json';
            case 'outbound': return '/outbound.json';
            case 'outbounds': return '/outbounds.json';
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
                    readOnly: readOnly,
                    minimap: { enabled: false },
                    fontSize: isMobile ? 12 : 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                    lineHeight: isMobile ? 18 : 20,
                    fixedOverflowWidgets: true,
                    quickSuggestions: true,
                    suggest: {
                        preview: false,
                        showWords: false,
                        showValues: true,
                        showProperties: true,
                    },
                    hover: { enabled: true, delay: 300 },
                    links: true,
                    contextmenu: true,
                    renderLineHighlight: 'all',
                    scrollbar: {
                        verticalScrollbarSize: isMobile ? 6 : 10,
                        horizontalScrollbarSize: isMobile ? 6 : 10,
                    },
                    glyphMargin: !isMobile,
                    folding: !isMobile,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    cursorBlinking: "smooth",
                    wordWrap: isMobile ? 'on' : 'off'
                }}
            />
            <style>{`
                .monaco-editor .decorationsOverviewRuler {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};