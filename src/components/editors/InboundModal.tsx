import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { toast } from 'sonner';

// Валидатор
import { validateOutbound, type ValidationError } from '../../utils/validator';
// Суб-компоненты
import { InboundGeneral } from './inbound/InboundGeneral';
import { InboundClients } from './inbound/InboundClients';
import { InboundSniffing } from './inbound/InboundSniffing';

export const InboundModal = ({ data, onSave, onClose }: any) => {
    const [local, setLocal] = useState(data || { 
        tag: `in-${Math.floor(Math.random()*1000)}`, 
        port: 10808, 
        protocol: "vless", 
        settings: { clients: [], decryption: "none" }, 
        streamSettings: { network: "tcp", security: "none", tcpSettings: {} },
        sniffing: { enabled: true, destOverride: ["http", "tls"] }
    });

    const [rawMode, setRawMode] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    
    const handleUpdate = (path: string | string[], value: any) => {
        const newObj = JSON.parse(JSON.stringify(local));
        
        if (Array.isArray(path)) {
            let curr = newObj;
            for (let i = 0; i < path.length - 1; i++) {
                if (!curr[path[i]]) curr[path[i]] = {};
                curr = curr[path[i]];
            }
            curr[path[path.length - 1]] = value;
        } else {
            newObj[path] = value;
        }
        
        setLocal(newObj);
        // Очищаем ошибки при изменении
        if (errors.length > 0) setErrors([]);
    };

    const handleProtocolChange = (proto: string) => {
        const newObj = { ...local, protocol: proto, settings: {} };
        const uuid = crypto.randomUUID();
        
        if (proto === 'vless') {
            newObj.settings = { clients: [{ id: uuid, flow: "xtls-rprx-vision", level: 0 }], decryption: "none" };
        } else if (proto === 'vmess') {
            newObj.settings = { clients: [{ id: uuid, level: 0 }] };
        } else if (proto === 'trojan') {
            newObj.settings = { clients: [{ password: "password", level: 0 }] };
        } else if (proto === 'shadowsocks') {
            newObj.settings = { method: "aes-256-gcm", password: "password", network: "tcp,udp" };
        } else if (proto === 'socks') {
            newObj.settings = { auth: "noauth", udp: true };
        }
        setLocal(newObj);
        setErrors([]);
    };

    const handleSave = () => {
        // Валидация перед сохранением
        const validationErrors = validateInbound(local);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix validation errors before saving");
            return;
        }
        onSave(local);
    };

    // Хелпер для поиска ошибки конкретного поля
    const getError = (field: string) => errors.find(e => e.field === field)?.message;

    if (rawMode) return (
        <Modal 
            title="Inbound JSON" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={<Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">UI Mode</Button>}
        >
            <div className="h-[600px]">
                <JsonField label="Full JSON" value={local} onChange={setLocal} className="h-full" />
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Inbound Editor" 
            onClose={onClose} 
            onSave={handleSave}
            extraButtons={<Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">JSON</Button>}
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 pb-10">
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
                    onChange={handleUpdate} 
                    onProtocolChange={handleProtocolChange}
                    // Передаем ошибки в компонент
                    errors={{
                        tag: getError('tag'),
                        port: getError('port')
                    }}
                />

                <InboundClients 
                    inbound={local} 
                    onChange={handleUpdate} 
                />

                <TransportSettings 
                    streamSettings={local.streamSettings} 
                    onChange={(newSettings) => handleUpdate('streamSettings', newSettings)}
                    isClient={false} 
                />

                <InboundSniffing 
                    sniffing={local.sniffing} 
                    onChange={handleUpdate} 
                />
            </div>
        </Modal>
    );
};