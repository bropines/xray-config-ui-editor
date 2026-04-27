import React from 'react';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { toast } from 'sonner';
import { generateXrayLink } from '../../utils/link-generator';
import { useOutboundEditor } from '../../hooks/useOutboundEditor';
import { EditorLayout } from '../ui/EditorLayout';

import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundWireguard } from './outbound/OutboundWireguard';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';
import { TransportSettings } from './shared/TransportSettings';

export const OutboundModal = ({ data, onSave, onClose, index }: any) => {
    const { config, addItem } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((t: any) => t);

    const {
        local,
        setLocal,
        updateField,
        handleProtocolChange,
        handleSave,
        rawMode,
        setRawMode,
        errors,
        getError,
        wgPeerErrors
    } = useOutboundEditor(data, onSave, index);

    const handleImport = (parsed: any) => {
        if (parsed.multiple && Array.isArray(parsed.outbounds)) {
            const [primary, ...others] = parsed.outbounds;
            setLocal(primary);
            others.forEach(outbound => addItem('outbounds', outbound));
            toast.success(`Imported ${parsed.outbounds.length} outbounds (chained)`);
        } else {
            setLocal(parsed);
            toast.success("Configuration imported successfully");
        }
        setRawMode(false);
    };

    const handleCopyLink = () => {
        const link = generateXrayLink(local);
        if (!link) {
            toast.error("Error generating link", { description: "Protocol might not be supported." });
            return;
        }
        navigator.clipboard.writeText(link).then(() => toast.success("Copied to clipboard!"));
    };

    const extraButtons = (
        <Button variant="success" className="text-xs py-1 px-3" onClick={handleCopyLink} icon="Copy">
            Copy Link
        </Button>
    );

    return (
        <EditorLayout
            title="Outbound Editor"
            local={local}
            setLocal={setLocal}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={errors}
            onSave={handleSave}
            onClose={onClose}
            schemaMode="outbound"
            extraButtons={extraButtons}
        >
            {/* Импорт из ссылки */}
            <OutboundImport onImport={handleImport} />

            {/* Тег + протокол */}
            <OutboundGeneral 
                outbound={local} 
                onChange={updateField} 
                onProtocolChange={handleProtocolChange}
                errors={{ tag: getError('tag') }} 
            />
            
            {/* Редактор, зависящий от протокола */}
            {local.protocol === 'wireguard' ? (
                <OutboundWireguard
                    outbound={local}
                    onChange={updateField}
                    errors={{
                        secretKey: getError('secretKey'),
                        peers:     getError('peers'),
                        ...wgPeerErrors,
                    }}
                />
            ) : (
                <OutboundServer
                    outbound={local}
                    onChange={updateField}
                    errors={{ address: getError('address'), port: getError('port') }}
                />
            )}
            
            {/* Mux / Proxy chain */}
            <OutboundProxyMux outbound={local} onChange={updateField} allTags={allOutboundTags} />

            {/* Transport / Stream Settings */}
            <TransportSettings
                streamSettings={local.streamSettings}
                onChange={(s: any) => updateField('streamSettings', s)}
                isClient={true}
                errors={{ reality: getError('reality') }}
            />
        </EditorLayout>
    );
};
