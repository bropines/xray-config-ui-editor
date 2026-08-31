import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { useConfigStore } from '../../store/configStore';

interface SectionJsonModalProps {
    title: string;
    data: any;
    onClose: () => void;
    onSave: (newData: any, rawText?: string) => void;
    schemaMode: any; // Добавили
}

export const SectionJsonModal = ({ title, data, onClose, onSave, schemaMode }: SectionJsonModalProps) => {
    const [localData, setLocalData] = useState(data);
    const [localRawText, setLocalRawText] = useState<string | null>(null);
    const rawConfigText = useConfigStore(state => state.rawConfigText);

    useEffect(() => {
        setLocalData(data);
        setLocalRawText(null);
    }, [data]);

    const handleChange = (newData: any, rawText?: string) => {
        setLocalData(newData);
        if (rawText !== undefined) {
            setLocalRawText(rawText);
        }
    };

    return (
        <Modal 
            title={title} 
            onClose={onClose} 
            onSave={() => {
                onSave(localData, localRawText || undefined);
                onClose();
            }}
            className="h-full overflow-hidden"
        >
            <JsonField
                label="Partial Configuration"
                value={localData}
                onChange={handleChange}
                className="flex-1"
                schemaMode={schemaMode}
                rawText={localRawText}
                rawConfigText={rawConfigText}
                onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
                onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
            />
        </Modal>
    );
};