import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore';
import { toast } from 'sonner';
import { generateXrayLink } from '../../utils/link-generator';
import { validateOutbound, validateWireguard, checkOutboundDuplication, type ValidationError } from '../../utils/validator';
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundWireguard } from './outbound/OutboundWireguard';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';

export const OutboundModal = ({ data, onSave, onClose, index }: any) => {
    const { config, addItem } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((t: any) => t);

    const [local, setLocal] = useState(data || { 
        tag: "out-" + Math.floor(Math.random()*1000), 
        protocol: "vless", 
        settings: {}, 
        streamSettings: { network: "tcp", security: "none" } 
    });

    const [rawMode, setRawMode] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const handleImport = (parsed: any) => {
        if (parsed.multiple && Array.isArray(parsed.outbounds)) {
            // Берем первый как основной для текущего редактирования
            const [primary, ...others] = parsed.outbounds;
            setLocal(primary);
            // Остальные добавляем в стор напрямую
            others.forEach(outbound => {
                addItem('outbounds', outbound);
            });
            toast.success(`Imported ${parsed.outbounds.length} outbounds (chained)`);
        } else {
            setLocal(parsed);
            toast.success("Configuration imported successfully");
        }
        setRawMode(false);
        setErrors([]);
    };

    const handleUpdate = (path: string | string[], value: any) => {
        const newObj = JSON.parse(JSON.stringify(local));
        if (Array.isArray(path)) {
            let curr = newObj;
            for (let i = 0; i < path.length - 1; i++) {
                if (!curr[path[i]] || typeof curr[path[i]] !== 'object') curr[path[i]] = {};
                curr = curr[path[i]];
            }
            curr[path[path.length - 1]] = value;
        } else {
            if (path === 'protocol') {
                newObj.settings = {};
                newObj.streamSettings = { network: "tcp", security: "none" };
            }
            newObj[path] = value;
        }
        setLocal(newObj);
        // Сбрасываем ошибки при любом изменении
        if (errors.length > 0) setErrors([]);
    };

    const handleSave = () => {
        // 1. Валидация общих полей (тег, протокол, адрес, порт, reality)
        const baseErrors = validateOutbound(local);

        // 2. Дополнительная валидация специфики WireGuard
        const wgErrors = local.protocol === 'wireguard' ? validateWireguard(local) : [];

        const allErrors = [...baseErrors, ...wgErrors];
        if (allErrors.length > 0) {
            setErrors(allErrors);
            toast.error("Form validation failed");
            return;
        }

        // 3. Проверка дубликатов
        const duplicateTag = checkOutboundDuplication(local, config?.outbounds || [], index);
        if (duplicateTag) {
            if (!confirm(`Duplicate detected! Similar configuration already exists in outbound tag: "${duplicateTag}". Save anyway?`)) {
                return;
            }
        }

        onSave(local);
    };

    const handleCopyLink = () => {
        const link = generateXrayLink(local);
        if (!link) {
            toast.error("Error generating link", { description: "Protocol might not be supported." });
            return;
        }
        navigator.clipboard.writeText(link).then(() => toast.success("Copied to clipboard!"));
    };

    // Хелпер: достаём сообщение ошибки по имени поля
    const getError = (field: string) => errors.find(e => e.field === field)?.message;

    // Хелпер: собираем объект ошибок WireGuard-пиров (ключи вида peer_N_endpoint / peer_N_publicKey)
    const wgPeerErrors = Object.fromEntries(
        errors
            .filter(e => e.field.startsWith('peer_'))
            .map(e => [e.field, e.message])
    );

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
        >
            <div className="h-[600px] flex flex-col">
                <JsonField label="Full JSON" value={local} onChange={setLocal} schemaMode="outbound" className="flex-1" />
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Outbound Editor" onClose={onClose} onSave={handleSave}
            extraButtons={modalButtons}
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 pb-10">
                {/* Блок ошибок */}
                {errors.length > 0 && (
                    <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-200 text-[11px]">
                        {errors.map((err, i) => <div key={i}>• {err.message}</div>)}
                    </div>
                )}
                
                {/* Импорт из ссылки */}
                <OutboundImport onImport={handleImport} />

                {/* Тег + протокол */}
                <OutboundGeneral outbound={local} onChange={handleUpdate} errors={{ tag: getError('tag') }} />
                
                {/* Редактор, зависящий от протокола */}
                {local.protocol === 'wireguard' ? (
                    <OutboundWireguard
                        outbound={local}
                        onChange={handleUpdate}
                        errors={{
                            secretKey: getError('secretKey'),
                            peers:     getError('peers'),
                            ...wgPeerErrors,
                        }}
                    />
                ) : (
                    <OutboundServer
                        outbound={local}
                        onChange={handleUpdate}
                        errors={{ address: getError('address'), port: getError('port') }}
                    />
                )}
                
                {/* Mux / Proxy chain */}
                <OutboundProxyMux outbound={local} onChange={handleUpdate} allTags={allOutboundTags} />

                {/* Transport / Stream Settings */}
                <TransportSettings
                    streamSettings={local.streamSettings}
                    onChange={(s: any) => handleUpdate('streamSettings', s)}
                    isClient={true}
                    errors={{ reality: getError('reality') }}
                />
            </div>
        </Modal>
    );
};