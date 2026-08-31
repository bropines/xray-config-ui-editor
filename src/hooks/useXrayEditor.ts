import { useState, useCallback } from 'react';
import { produce } from 'immer';
import type { ValidationError } from '../core/validators';
import { toast } from 'sonner';

interface UseXrayEditorOptions<T> {
    data: T;
    onSave: (data: T, rawText?: string | null) => void;
    validate: (data: T) => ValidationError[];
    onProtocolChange?: (proto: string) => T;
}

export const useXrayEditor = <T extends Record<string, any>>({
    data,
    onSave,
    validate,
    onProtocolChange
}: UseXrayEditorOptions<T>) => {
    const [local, setLocalData] = useState<T>(data);
    const [rawText, setRawText] = useState<string | null>(null);
    const [rawMode, setRawMode] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const setLocal = useCallback((newData: any, newRawText?: string) => {
        if (typeof newData === 'function') {
            setLocalData(prev => newData(prev));
        } else {
            setLocalData(newData);
        }
        if (newRawText !== undefined) {
            setRawText(newRawText);
        }
    }, []);

    const updateField = useCallback((path: string | (string | number)[], value: any) => {
        setLocalData(
            produce((draft: any) => {
                if (Array.isArray(path)) {
                    let curr = draft;
                    for (let i = 0; i < path.length - 1; i++) {
                        const key = path[i];
                        if (!curr[key] || typeof curr[key] !== 'object') {
                            curr[key] = typeof path[i+1] === 'number' ? [] : {};
                        }
                        curr = curr[key];
                    }
                    curr[path[path.length - 1]] = value;
                } else {
                    draft[path] = value;
                }
            })
        );
        setRawText(null);
        if (errors.length > 0) setErrors([]);
    }, [errors.length]);

    const handleProtocolChange = useCallback((proto: string) => {
        if (onProtocolChange) {
            setLocalData(onProtocolChange(proto));
        } else {
            updateField('protocol', proto);
        }
        setRawText(null);
        setErrors([]);
    }, [onProtocolChange, updateField]);

    const handleSave = useCallback(() => {
        const validationErrors = validate(local);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix validation errors before saving");
            return;
        }
        // `rawText` is only non-null when it's still in sync with `local` —
        // any field-level edit (updateField/handleProtocolChange) clears it
        // immediately. Pass it through so the caller can splice the user's
        // literal raw-JSON text (comments and all) back into the config
        // instead of a freshly-serialized, comment-free `local` object.
        onSave(local, rawText);
    }, [local, rawText, onSave, validate]);

    const getError = useCallback((field: string) => 
        errors.find(e => e.field === field)?.message
    , [errors]);

    return {
        local,
        setLocal,
        rawText,
        setRawText,
        updateField,
        handleProtocolChange,
        handleSave,
        rawMode,
        setRawMode,
        errors,
        setErrors,
        getError
    };
};
