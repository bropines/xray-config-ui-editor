import React from 'react';
import { Modal } from '../ui/Modal';
import { EditorSettingsEditor } from './settings/EditorSettingsEditor';

export const EditorSettingsModal = ({
    onClose,
    onOpenHistory
}: {
    onClose: () => void;
    onOpenHistory?: () => void;
}) => {
    return (
        <Modal
            title="Editor Settings & Profiles"
            onClose={onClose}
            onSave={onClose}
            className="max-w-3xl"
        >
            <EditorSettingsEditor onOpenHistory={() => { onClose(); onOpenHistory?.(); }} />
        </Modal>
    );
};
