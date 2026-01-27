import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore'; // Импорт стора

// Суб-компоненты
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundProxyMux } from './outbound/OutboundProxyMux'; // Новый компонент

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

    if (rawMode) return (
        <Modal 
            title="Outbound JSON" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={<Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">Form Mode</Button>}
        >
            <div className="h-[600px] flex flex-col">
                <OutboundImport onImport={handleImport} />
                <JsonField label="JSON" value={local} onChange={setLocal} className="flex-1" />
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Outbound Editor" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={<Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">JSON / Import</Button>}
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

                {/* PROXY & MUX (NEW) */}
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