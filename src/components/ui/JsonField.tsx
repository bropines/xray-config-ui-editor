import React, { useState, useEffect } from "react";
import { JsonEditor } from "./JsonEditor";

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any) => void;
    className?: string;
}

export const JsonField = ({ label, value, onChange, className = "" }: JsonFieldProps) => {
    // Храним текстовое представление для редактора
    const [text, setText] = useState("");
    const [error, setError] = useState(false);

    // При изменении внешнего value обновляем текст, НО только если value реально отличается,
    // чтобы курсор не прыгал при каждом нажатии клавиши
    useEffect(() => {
        try {
            const currentObj = JSON.parse(text || "null");
            // Глубокое сравнение делать дорого, сравниваем строки
            if (JSON.stringify(currentObj) !== JSON.stringify(value)) {
                setText(JSON.stringify(value, null, 2));
            }
        } catch (e) {
            // Если текущий текст невалиден, но пришло новое value извне, обновляем
            setText(JSON.stringify(value, null, 2));
        }
    }, [value]); // Зависимость от value может быть триггером, но лучше использовать JSON.stringify(value) если объект меняется по ссылке

    const handleEditorChange = (newVal: string | undefined) => {
        const v = newVal || "";
        setText(v);
        try {
            if (v.trim() === "") {
                onChange(undefined);
                setError(false);
            } else {
                const parsed = JSON.parse(v);
                onChange(parsed);
                setError(false);
            }
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className={`flex flex-col gap-2 h-full ${className}`}>
            {label && (
                <label className="text-xs uppercase font-bold text-slate-500 flex justify-between">
                    {label}
                    {error && <span className="text-rose-500 font-bold animate-pulse">Invalid JSON syntax</span>}
                </label>
            )}
            <div className={`flex-1 min-h-[300px] rounded-lg overflow-hidden transition-all ${error ? 'ring-1 ring-rose-500' : ''}`}>
                <JsonEditor value={text} onChange={handleEditorChange} />
            </div>
        </div>
    );
};