import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useTagDetails } from '../../hooks/useTagDetails';

export const TagDetailsModal = ({ 
    tag, 
    customUrl, 
    customFormat, 
    onClose 
}: { 
    tag: string, 
    customUrl?: string, 
    customFormat?: string, 
    onClose: () => void 
}) => {
    const { text, loading, handleCopy } = useTagDetails(tag, customUrl, customFormat);

    return (
        <Modal 
            title={`Details: ${tag}`} 
            onClose={onClose} 
            onSave={onClose} 
            className="max-w-2xl" 
            extraButtons={<Button variant="secondary" onClick={handleCopy} icon="Copy">Copy Raw Text</Button>}
        >
            <div className="h-[400px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl">
                        <Icon name="Spinner" className="animate-spin text-4xl mb-3 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Extracting records...</span>
                    </div>
                ) : (
                    <textarea 
                        readOnly 
                        className="w-full h-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-emerald-400 resize-none outline-none custom-scroll focus:border-indigo-500 shadow-inner"
                        value={text}
                    />
                )}
            </div>
        </Modal>
    );
};