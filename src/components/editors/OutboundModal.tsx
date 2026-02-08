import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { TransportSettings } from './shared/TransportSettings';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon';
import { toast } from 'sonner';

// Утилиты
import { parseXrayLink } from '../../utils/link-parser';
import { generateLink } from '../../utils/link-generator';
import { validateOutbound } from '../../utils/validator';
import type { ValidationError } from '../../utils/validator';

// Суб-компоненты
import { OutboundImport } from './outbound/OutboundImport';
import { OutboundGeneral } from './outbound/OutboundGeneral';
import { OutboundServer } from './outbound/OutboundServer';
import { OutboundProxyMux } from './outbound/OutboundProxyMux';

export const OutboundModal = ({ data, onSave, onClose }: any) => {
    const { config } = useConfigStore();
    const allOutboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((t: any) => t);

    const [local, setLocal] = useState(data || {
        tag: "out-" + Math.floor(Math.random() * 1000),
        protocol: "freedom",
        settings: {},
        streamSettings: {}
    });

    const [rawMode, setRawMode] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const handleImport = (parsedConfig: any) => {
        setLocal(parsedConfig);
        setRawMode(false);
        setErrors([]);
        toast.success("Configuration imported successfully");
    };

    // Внутри OutboundModal.tsx измени функцию handleUpdate на эту версию:

    const handleUpdate = (path: string | string[], value: any) => {
        // Создаем глубокую копию объекта, чтобы не наткнуться на Read-only свойства
        const newObj = JSON.parse(JSON.stringify(local));

        if (Array.isArray(path)) {
            let curr = newObj;
            for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];
                // Если узла нет или это не объект — создаем объект
                if (!curr[key] || typeof curr[key] !== 'object') {
                    curr[key] = {};
                }
                curr = curr[key];
            }
            // Устанавливаем финальное значение
            curr[path[path.length - 1]] = value;
        } else {
            if (path === 'protocol') {
                newObj.settings = {};
                newObj.streamSettings = { network: "tcp", security: "none" };
            }
            newObj[path] = value;
        }

        setLocal(newObj);
        if (errors.length > 0) setErrors([]);
    };

    const handleSave = () => {
        const validationErrors = validateOutbound(local);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix validation errors");
            return;
        }
        onSave(local);
    };

    const handleCopyLink = () => {
        const link = generateLink(local);
        if (!link) {
            toast.error("Error generating link", {
                description: "Protocol might not be supported or required fields are missing."
            });
            return;
        }
        if (!navigator.clipboard) {
            // Fallback logic omitted for brevity
            return;
        }
        navigator.clipboard.writeText(link).then(() => {
            toast.success("Link copied to clipboard!");
        });
    };

    const getError = (field: string) => errors.find(e => e.field === field)?.message;

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
                <JsonField
                    label="JSON"
                    value={local}
                    onChange={setLocal}
                    className="flex-1"
                    schemaMode="outbound" // <---
                />
            </div>
        </Modal>
    );

    return (
        <Modal
            title="Outbound Editor"
            onClose={onClose}
            onSave={handleSave}
            extraButtons={
                <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs py-1" onClick={handleCopyLink} icon="Copy">Copy Link</Button>
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">JSON / Import</Button>
                </div>
            }
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 pb-10">

                {errors.length > 0 && (
                    <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-200 text-xs">
                        <p className="font-bold mb-1">Validation Errors:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                            {errors.map((err, i) => <li key={i}>{err.message}</li>)}
                        </ul>
                    </div>
                )}

                <OutboundImport onImport={handleImport} />

                <OutboundGeneral
                    outbound={local}
                    onChange={handleUpdate}
                    errors={{ tag: getError('tag') }}
                />

                <OutboundServer
                    outbound={local}
                    onChange={handleUpdate}
                    errors={{
                        address: getError('address'),
                        port: getError('port')
                    }}
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