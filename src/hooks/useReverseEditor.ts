import { useState, useCallback, useMemo } from 'react';
import { useConfigStore } from '../store/configStore';

export const useReverseEditor = () => {
    const { config, updateSection } = useConfigStore();
    // Memoised so the callbacks below keep their identity between renders.
    const reverse = useMemo(() => config?.reverse || { bridges: [], portals: [] }, [config?.reverse]);
    const [activeTab, setActiveTab] = useState<'bridges' | 'portals'>('bridges');

    const updateList = useCallback((type: 'bridges' | 'portals', newList: any[]) => {
        updateSection('reverse', { ...reverse, [type]: newList });
    }, [reverse, updateSection]);

    const addItem = useCallback((type: 'bridges' | 'portals') => {
        updateList(type, [...(reverse[type] || []), { tag: "reverse-" + type, domain: "example.com" }]);
    }, [reverse, updateList]);

    const removeItem = useCallback((type: 'bridges' | 'portals', idx: number) => {
        const n = [...(reverse[type] || [])];
        n.splice(idx, 1);
        updateList(type, n);
    }, [reverse, updateList]);

    const updateItem = useCallback((type: 'bridges' | 'portals', idx: number, field: string, val: string) => {
        const n = [...(reverse[type] || [])];
        const current = n[idx];
        // An index past the end would otherwise write a half-formed entry
        // with neither tag nor domain.
        if (!current) return;
        n[idx] = { ...current, [field]: val };
        updateList(type, n);
    }, [reverse, updateList]);

    const updateReverse = useCallback((newReverse: any, rawText?: string) => {
        updateSection('reverse', newReverse, rawText);
    }, [updateSection]);

    return {
        reverse,
        activeTab,
        setActiveTab,
        addItem,
        removeItem,
        updateItem,
        updateReverse
    };
};
