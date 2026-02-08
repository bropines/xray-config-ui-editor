import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';

interface SectionJsonModalProps {
    title: string;
    data: any;
    onClose: () => void;
    onSave: (newData: any) => void;
}

export const SectionJsonModal = ({ title, data, onClose, onSave }: SectionJsonModalProps) => {
    const [localData, setLocalData] = useState(data);

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    return (
        <Modal 
            title={title} 
            onClose={onClose} 
            onSave={() => onSave(localData)}
        >
            <div className="h-[600px] flex flex-col">
                <div className="bg-blue-900/20 p-2 mb-2 rounded border border-blue-500/30 text-xs text-blue-200">
                    You are editing a specific section of the configuration. Changes will be applied immediately upon saving.
                </div>
                <JsonField 
                    label="Partial Configuration" 
                    value={localData} 
                    onChange={setLocalData} 
                    className="flex-1" 
                />
            </div>
        </Modal>
    );
};