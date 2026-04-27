import React from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { toast } from 'sonner';

// Суб-компоненты
import { InboundGeneral } from './inbound/InboundGeneral';
import { InboundClients } from './inbound/InboundClients';
import { InboundSniffing } from './inbound/InboundSniffing';
import { InboundTun } from './inbound/InboundTun';

import { generateXrayLink } from '../../utils/link-generator';
import { useConfigStore } from '../../store/configStore';
import { useInboundEditor } from '../../hooks/useInboundEditor';

export const InboundModal = ({ data, onSave, onClose }: any) => {
    const { remnawave } = useConfigStore();
    const {
        local,
        setLocal,
        updateField,
        handleProtocolChange,
        handleSave,
        rawMode,
        setRawMode,
        errors,
        getError
    } = useInboundEditor(data, onSave);

    const copyLink = () => {
        const link = generateXrayLink(local);
        if (link) {
            navigator.clipboard.writeText(link);
            toast.success("Link copied to clipboard!");
        } else {
            toast.error("Could not generate link for this protocol");
        }
    };

    const modalButtons = (
        <div className="flex gap-2">
            {!remnawave.connected && (
                <Button variant="success" className="text-xs py-1 px-3" onClick={copyLink} icon="Copy">Copy Link</Button>
            )}
            <Button variant="secondary" className="text-xs py-1 px-3" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>
                {rawMode ? "UI Mode" : "JSON"}
            </Button>
        </div>
    );

    if (rawMode) return (
        <Modal
            title="Inbound JSON"
            onClose={onClose}
            onSave={handleSave}
            extraButtons={modalButtons}
            className="h-full overflow-hidden"
        >
            <JsonField label="Full JSON" value={local} onChange={setLocal} schemaMode="inbound" className="flex-1" />
        </Modal>
    );

    return (
        <Modal
            title="Inbound Editor"
            onClose={onClose}
            onSave={handleSave}
            extraButtons={modalButtons}
        >
            <div className="flex flex-col h-full md:max-h-[60vh] adaptive-height overflow-y-auto custom-scroll p-1 pb-10">
                {/* Блок ошибок */}
                {errors.length > 0 && (
                    <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-200 text-xs animate-in fade-in slide-in-from-top-2">
                        <p className="font-bold mb-1">Validation Errors:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            {errors.map((err, i) => <li key={i}>{err.message}</li>)}
                        </ul>
                    </div>
                )}

                <InboundGeneral
                    inbound={local}
                    onChange={updateField}
                    onProtocolChange={handleProtocolChange}
                    errors={{
                        tag: getError('tag'),
                        port: getError('port')
                    }}
                />

                {/* Если выбран TUN - показываем его редактор, иначе стандартный клиентский */}
                {local.protocol === 'tun' ? (
                    <InboundTun inbound={local} onChange={updateField} />
                ) : (
                    <InboundClients
                        inbound={local}
                        onChange={updateField}
                        errors={{
                            password: getError('password'),
                            clients: getError('clients'),
                        }}
                    />
                )}

                {/* Transport Settings не нужны для TUN */}
                {local.protocol !== 'tun' && (
                    <TransportSettings
                        streamSettings={local.streamSettings || {}}
                        onChange={(newSettings) => updateField('streamSettings', newSettings)}
                        isClient={false}
                    />
                )}

                <InboundSniffing
                    sniffing={local.sniffing}
                    onChange={updateField}
                />
            </div>
        </Modal>
    );
};