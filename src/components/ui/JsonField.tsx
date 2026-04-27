import React, { useState, useEffect, useRef } from "react";
import { JsonEditor } from "./JsonEditor";
import { MobileJsonEditor } from "./MobileJsonEditor";

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any) => void;
    className?: string;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing';
}

export const JsonField = ({ label, value, onChange, className = "", schemaMode = 'full' }: JsonFieldProps) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);
    const isInternalUpdate = useRef(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isInternalUpdate.current) {
            // Клонируем и удаляем технический индекс 'i', если он есть
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const { i, ...cleanValue } = value as any;
                setText(JSON.stringify(cleanValue, null, 2));
            } else {
                setText(JSON.stringify(value, null, 2));
            }
        }
        isInternalUpdate.current = false;
    }, [value]);

    // Функция для удаления комментариев перед парсингом (чтобы JSON.parse не падал)
    const stripComments = (jsonString: string) => {
        return jsonString.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    };

    const handleEditorChange = (newVal: string | undefined) => {
        const v = newVal || "";
        setText(v);
        try {
            if (v.trim() === "") {
                onChange(undefined);
                setError(false);
            } else {
                // Сначала чистим комменты, потом парсим
                const cleanJson = stripComments(v);
                const parsed = JSON.parse(cleanJson);
                
                isInternalUpdate.current = true;
                onChange(parsed);
                setError(false);
            }
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className={`flex flex-col gap-2 h-full w-full min-w-0 ${className}`}>
            {label && (
                <div className="flex justify-between items-end">
                    <label className="text-xs uppercase font-bold text-slate-500">
                        {label}
                    </label>
                    {error && <span className="text-rose-500 font-bold text-[10px] animate-pulse">Invalid JSON Syntax</span>}
                </div>
            )}
            
            {/* Контейнер редактора с абсолютным позиционированием внутри flex-элемента */}
            <div className={`flex-1 min-h-[65vh] relative rounded-lg overflow-hidden border transition-all bg-[#1e1e1e] ${error ? 'border-rose-500/50' : 'border-slate-700'}`}>
                <div className="absolute inset-0">
                    {isMobile ? (
                        <MobileJsonEditor 
                            value={text} 
                            onChange={handleEditorChange}
                            schemaMode={schemaMode}
                        />
                    ) : (
                        <JsonEditor 
                            value={text} 
                            onChange={handleEditorChange} 
                            schemaMode={schemaMode} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};