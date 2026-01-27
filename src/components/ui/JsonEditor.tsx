import React from "react";
import Editor from "@monaco-editor/react";

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    readOnly?: boolean;
}

export const JsonEditor = ({ value, onChange, readOnly = false }: JsonEditorProps) => {
    return (
        <div className="h-full w-full border border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
            <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={value}
                onChange={onChange}
                options={{
                    readOnly,
                    minimap: { enabled: false }, // Скрываем мини-карту для экономии места
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                }}
            />
        </div>
    );
};