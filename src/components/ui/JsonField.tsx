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
    const [error, setError] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Подготавливаем начальное текстовое значение один раз при смене value извне
    const getInitialText = () => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const { i, ...cleanValue } = value as any;
            return JSON.stringify(cleanValue, null, 2);
        }
        return JSON.stringify(value, null, 2);
    };

    // Улучшенная функция для удаления комментариев перед парсингом.
    // Она корректно игнорирует // внутри строк (например, в URL или ключах).
    const stripComments = (jsonString: string) => {
        return jsonString.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => {
            return group1 ? group1 : "";
        });
    };

    const handleEditorChange = (newVal: string | undefined) => {
        const v = newVal || "";
        try {
            if (v.trim() === "") {
                onChange(undefined);
                setError(false);
            } else {
                const cleanJson = stripComments(v);
                const parsed = JSON.parse(cleanJson);
                onChange(parsed);
                setError(false);
            }
        } catch (err) {
            setError(true);
        }
    };

    // Генерируем ключ для сброса редактора при смене контекста (например, разные инбаунды)
    // Мы используем stringify начального значения, чтобы при открытии новой модалки defaultValue обновился.
    const initialText = getInitialText();

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
            
            <div className={`flex-1 min-h-[65vh] relative rounded-lg overflow-hidden border transition-all bg-[#1e1e1e] ${error ? 'border-rose-500/50' : 'border-slate-700'}`}>
                <div className="absolute inset-0">
                    {isMobile ? (
                        <MobileJsonEditor 
                            key={`${schemaMode}-mobile`}
                            value={initialText} 
                            onChange={handleEditorChange}
                            schemaMode={schemaMode}
                        />
                    ) : (
                        <JsonEditor 
                            key={`${schemaMode}-${initialText.length}`} // Сбрасываем инстанс при смене типа схемы или длины текста
                            value={initialText} 
                            onChange={handleEditorChange} 
                            schemaMode={schemaMode} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};