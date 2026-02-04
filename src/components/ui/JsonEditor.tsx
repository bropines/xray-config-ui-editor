import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import xraySchema from "../../utils/config.schema.json";

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
}

export const JsonEditor = ({ value, onChange, readOnly = false }: JsonEditorProps) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    const handleEditorWillMount = (monaco: any) => {
        monacoRef.current = monaco;
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            schemas: [
                {
                    uri: "internal://xray-config-schema.json",
                    fileMatch: ["*"], 
                    schema: xraySchema,
                },
            ],
        });
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        
        editor.layout();

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                editor.layout();
                setTimeout(() => editor.layout(), 200);
            });
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (editorRef.current) editorRef.current.layout();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="h-full w-full border border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e] monaco-editor-container" 
             style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Editor
                height="100%"
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
                    fontLigatures: true,
                    letterSpacing: 0,
                    renderWhitespace: "none",
                    fixedOverflowWidgets: true,
                }}
            />
            <style>{`
                /* Убираем любые попытки Tailwind переопределить высоту строки внутри редактора */
                .monaco-editor-container .monaco-editor .view-line {
                    line-height: 20px !important;
                }
                /* Скрываем горизонтальный скролл, если он дергается на 1-2 пикселя */
                .monaco-editor .decorationsOverviewRuler {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};