import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore';
import { toast } from 'sonner';

import { generateLink } from '../../utils/link-generator';
import { validateOutbound, checkOutboundDuplication, type ValidationError } from '../../utils/validator';

import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';

export const OutboundModal = ({ data, onSave, onClose, index }: any) => {
    const { config } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((t: any) => t);

    const [local, setLocal] = useState(data || { 
        tag: "out-" + Math.floor(Math.random()*1000), 
        protocol: "vless", 
        settings: {}, 
        streamSettings: { network: "tcp", security: "none" } 
    });
    
    const [rawMode, setRawMode] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const handleImport = (parsedConfig: any) => {
        setLocal(parsedConfig);
        setRawMode(false);
        setErrors([]);
        toast.success("Configuration imported successfully");
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
        setErrors([]);
    };

    const handleSave = () => {
        // 1. Валидация полей
        const valErrors = validateOutbound(local);
        if (valErrors.length > 0) {
            setErrors(valErrors);
            toast.error("Form validation failed");
            return;
        }

        // 2. Проверка дубликатов
        const duplicateTag = checkOutboundDuplication(local, config?.outbounds || [], index);
        if (duplicateTag) {
            if (!confirm(`Duplicate detected! Similar configuration already exists in outbound tag: "${duplicateTag}". Save anyway?`)) {
                return;
            }
        }
        onSave(local);
    };

    const handleCopyLink = () => {
        const link = generateLink(local);
        if (!link) {
            toast.error("Error generating link", { description: "Protocol might not be supported." });
            return;
        }
        navigator.clipboard.writeText(link).then(() => toast.success("Copied!"));
    };

    const getError = (field: string) => errors.find(e => e.field === field)?.message;

    if (rawMode) return (
        <Modal 
            title="Outbound JSON" onClose={onClose} onSave={handleSave}
            extraButtons={
                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs py-1" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">Form Mode</Button>
                </div>
            }
        >
            <div className="h-[600px] flex flex-col gap-4">
                <OutboundImport onImport={handleImport} />
                <JsonField label="Full JSON" value={local} onChange={setLocal} schemaMode="outbound" className="flex-1" />
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Outbound Editor" onClose={onClose} onSave={handleSave}
            extraButtons={
                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs py-1" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">JSON / Import</Button>
                </div>
            }
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 pb-10">
                {errors.length > 0 && (
                    <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-200 text-[11px]">
                        {errors.map((err, i) => <div key={i}>• {err.message}</div>)}
                    </div>
                )}
                
                {/* Компонент импорта добавлен и сюда для удобства */}
                <OutboundImport onImport={handleImport} />

                <OutboundGeneral outbound={local} onChange={handleUpdate} errors={{ tag: getError('tag') }} />
                <OutboundServer outbound={local} onChange={handleUpdate} errors={{ address: getError('address'), port: getError('port') }} />
                <OutboundProxyMux outbound={local} onChange={handleUpdate} allTags={allOutboundTags} />
                <TransportSettings streamSettings={local.streamSettings} onChange={(s: any) => handleUpdate('streamSettings', s)} isClient={true} />
            </div>
        </Modal>
    );
};