import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { JsonField } from './JsonField';
import { ValidationSummary } from './ValidationSummary';

interface EditorLayoutProps {
    title: string;
    local: any;
    setLocal: (data: any) => void;
    rawMode: boolean;
    setRawMode: (val: boolean) => void;
    errors: any[];
    onSave: () => void;
    onClose: () => void;
    schemaMode: any;
    children: React.ReactNode;
    extraButtons?: React.ReactNode;
}

export const EditorLayout = ({
    title,
    local,
    setLocal,
    rawMode,
    setRawMode,
    errors,
    onSave,
    onClose,
    schemaMode,
    children,
    extraButtons
}: EditorLayoutProps) => {
    
    const modalButtons = (
        <div className="flex gap-2">
            {extraButtons}
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setRawMode(!rawMode)} 
                icon={rawMode ? "Layout" : "Code"}
                iconWeight="bold"
            >
                {rawMode ? "UI Mode" : "JSON Mode"}
            </Button>
        </div>
    );

    return (
        <Modal 
            title={rawMode ? `${title} (Source)` : title} 
            onClose={onClose} 
            onSave={onSave}
            extraButtons={modalButtons}
            className="h-full overflow-hidden"
        >
            <ValidationSummary errors={errors} />

            {rawMode ? (
                <div className="flex-1 min-h-0 h-full flex flex-col animate-in fade-in duration-300">
                    <JsonField 
                        label="Source Configuration" 
                        value={local} 
                        onChange={setLocal} 
                        schemaMode={schemaMode} 
                        className="flex-1 relative min-h-0" 
                    />
                </div>
            ) : (
                <div className="flex flex-col h-full md:max-h-[60vh] adaptive-height overflow-y-auto custom-scroll p-1 pb-12">
                    {children}
                </div>
            )}
        </Modal>
    );
};
