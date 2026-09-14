import React from 'react';
import { Modal } from '../ui/Modal';
import { EditorSettingsEditor } from './settings/EditorSettingsEditor';
import { t } from '../../i18n';

export const EditorSettingsModal = ({
    onClose,
    onOpenHistory
}: {
    onClose: () => void;
    onOpenHistory?: () => void;
}) => {
    return (
        <Modal
            title={t("Editor Settings & Profiles")}
            onClose={onClose}
            onSave={onClose}
            className="max-w-3xl"
        >
            <EditorSettingsEditor onOpenHistory={() => { onClose(); onOpenHistory?.(); }} />
        </Modal>
    );
};
