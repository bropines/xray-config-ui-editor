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
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Используем ResizeObserver для корректного пересчета размеров
    useEffect(() => {
        if (!containerRef.current) return;
        
        const observer = new ResizeObserver(() => {
            if (editorRef.current) {
                editorRef.current.layout();
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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
        
        // Фокусируемся на шрифтах - Monaco критически зависит от правильной ширины символа
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                editor.layout();
            });
        }
        
        // Устанавливаем курсор в начало при первом рендере
        editor.focus();
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
        <div 
            ref={containerRef}
            className="h-full w-full border border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e] monaco-editor-container"
        >
            <Editor
                height="100%"
                path={getFilePath()}
                defaultLanguage="json"
                theme="vs-dark"
                // КЛЮЧЕВОЕ: Используем defaultValue вместо value для предотвращения прыжков курсора
                defaultValue={value}
                onChange={onChange}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
                options={{
                    readOnly: readOnly,
                    minimap: { enabled: false },
                    fontSize: isMobile ? 12 : 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontLigatures: false, // Выключаем лигатуры, они ломают расчеты ширины в Monaco
                    scrollBeyondLastLine: false,
                    automaticLayout: false, // Отключаем встроенный, так как мы используем ResizeObserver выше
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
                    wordWrap: isMobile ? 'on' : 'off',
                    letterSpacing: 0, // Важно: любой letter-spacing ломает выделение
                }}
            />
            <style>{`
                /* Сброс всех внешних стилей, которые могут протечь внутрь Monaco */
                .monaco-editor, .monaco-editor .view-lines, .monaco-editor .view-line {
                    letter-spacing: 0px !important;
                    font-feature-settings: "liga" 0, "calt" 0 !important;
                }
                .monaco-editor .decorationsOverviewRuler {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};