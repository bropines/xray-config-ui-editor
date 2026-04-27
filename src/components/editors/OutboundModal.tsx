import React from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore';
import { toast } from 'sonner';
import { generateXrayLink } from '../../utils/link-generator';
import { useOutboundEditor } from '../../hooks/useOutboundEditor';
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundWireguard } from './outbound/OutboundWireguard';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';

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

    const modalButtons = (
        <div className="flex gap-2">
            <Button variant="success" className="text-xs py-1 px-3" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
            <Button variant="secondary" className="text-xs py-1 px-3" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>
                {rawMode ? "UI Mode" : "JSON / Import"}
            </Button>
        </div>
    );

    if (rawMode) return (
        <Modal 
            title="Outbound JSON" onClose={onClose} onSave={handleSave}
            extraButtons={modalButtons}
            className="h-full overflow-hidden"
        >
            <JsonField label="Full JSON" value={local} onChange={setLocal} schemaMode="outbound" className="flex-1" />
        </Modal>
    );

    return (
        <Modal 
            title="Outbound Editor" onClose={onClose} onSave={handleSave}
            extraButtons={modalButtons}
        >
            <div className="flex flex-col h-full md:max-h-[60vh] adaptive-height overflow-y-auto custom-scroll p-1 pb-10">
                {/* Блок ошибок */}
                {errors.length > 0 && (
                    <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-200 text-[11px]">
                        {errors.map((err, i) => <div key={i}>• {err.message}</div>)}
                    </div>
                )}
                
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
            </div>
        </Modal>
    );
};