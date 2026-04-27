import React from 'react';
import { useInboundEditor } from '../../hooks/useInboundEditor';
import { EditorLayout } from '../ui/EditorLayout';
import { InboundGeneral } from './inbound/InboundGeneral';
import { InboundClients } from './inbound/InboundClients';
import { InboundSniffing } from './inbound/InboundSniffing';
import { InboundTun } from './inbound/InboundTun';
import { TransportSettings } from './shared/TransportSettings';

export const InboundModal = ({ data, onSave, onClose }: any) => {
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

    return (
        <EditorLayout
            title="Inbound Editor"
            local={local}
            setLocal={setLocal}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={errors}
            onSave={handleSave}
            onClose={onClose}
            schemaMode="inbound"
        >
            <InboundGeneral 
                inbound={local} 
                onChange={updateField} 
                onProtocolChange={handleProtocolChange}
                errors={{ tag: getError('tag'), port: getError('port') }} 
            />

            {local.protocol === 'tun' ? (
                <InboundTun inbound={local} onChange={updateField} />
            ) : (
                <InboundClients 
                    inbound={local} 
                    onChange={updateField} 
                    errors={{ clients: getError('clients') }} 
                />
            )}

            {/* Transport / Stream Settings */}
            <TransportSettings
                streamSettings={local.streamSettings}
                onChange={(s: any) => updateField('streamSettings', s)}
                isClient={false}
            />

            <InboundSniffing
                sniffing={local.sniffing}
                onChange={updateField}
            />
        </EditorLayout>
    );
};
