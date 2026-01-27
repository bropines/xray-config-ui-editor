import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon'; // Импорт иконки

// Утилиты
import { parseXrayLink } from '../../utils/link-parser';
import { generateLink } from '../../utils/link-generator'; // Импорт генератора

// Суб-компоненты
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';

export const OutboundModal = ({ data, onSave, onClose }) => {
    // Достаем все теги из стора для цепочек прокси
    const { config } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map(o => o.tag).filter(t => t);

    // Начальное состояние
    const [local, setLocal] = useState(data || { 
        tag: "out-" + Math.floor(Math.random()*1000), 
        protocol: "freedom", 
        settings: {}, 
        streamSettings: {} 
    });
    
    const [rawMode, setRawMode] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");

    const handleImport = (parsedConfig) => {
        setLocal(parsedConfig);
        setRawMode(false);
    };

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
            if (path === 'protocol') {
                newObj.settings = {};
                newObj.streamSettings = {};
            }
            newObj[path] = value;
        }
        
        setLocal(newObj);
    };

    // Функция копирования
    const handleCopyLink = () => {
        const link = generateLink(local);
        if (link) {
            navigator.clipboard.writeText(link);
            alert("Link copied to clipboard!");
        } else {
            alert("Could not generate link for this config (maybe protocol not supported or missing fields).");
        }
    };

    if (rawMode) return (
        <Modal 
            title="Outbound JSON" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={
                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs py-1" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">Form Mode</Button>
                </div>
            }
        >
            <div className="h-[600px] flex flex-col gap-4">
                <OutboundImport onImport={handleImport} />
                {/* Теперь JsonField использует Monaco внутри */}
                <JsonField label="JSON" value={local} onChange={setLocal} className="flex-1" />
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Outbound Editor" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={
                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs py-1" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">JSON / Import</Button>
                </div>
            }
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 pb-10">
                <OutboundImport onImport={handleImport} />

                <OutboundGeneral 
                    outbound={local} 
                    onChange={handleUpdate} 
                />

                <OutboundServer 
                    outbound={local} 
                    onChange={handleUpdate} 
                />

                <OutboundProxyMux 
                    outbound={local}
                    onChange={handleUpdate}
                    allTags={allOutboundTags}
                />

                <TransportSettings 
                    streamSettings={local.streamSettings} 
                    onChange={(newSettings) => handleUpdate('streamSettings', newSettings)}
                    isClient={true} 
                />
            </div>
        </Modal>
    );
};