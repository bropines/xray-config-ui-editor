import React from 'react';
import { Card } from '../../ui/Card';
import { SchemaForm } from '../../ui/SchemaForm';
import { InboundSchema } from '../../../core/xray/schemas';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    const isTun = inbound.protocol === 'tun';

    const handleFormChange = (newInbound: any) => {
        if (newInbound.protocol !== inbound.protocol) {
            onProtocolChange(newInbound.protocol);
        }
        
        // Find modified or added keys
        Object.keys(newInbound).forEach(key => {
            if (newInbound[key] !== inbound[key]) {
                onChange(key, newInbound[key]);
            }
        });
        
        // Find deleted keys
        Object.keys(inbound).forEach(key => {
            if (newInbound[key] === undefined && inbound[key] !== undefined) {
                onChange(key, undefined);
            }
        });
    };

    const excludeKeys = ['settings', 'streamSettings', 'sniffing', 'allocate'];
    if (isTun) {
        excludeKeys.push('port', 'listen');
    }

    return (
        <Card title="Inbound Connectivity" icon="Globe">
            <SchemaForm
                schema={InboundSchema}
                value={inbound}
                onChange={handleFormChange}
                errors={errors}
                excludeKeys={excludeKeys}
                fieldConfigs={{
                    protocol: {
                        label: "Protocol",
                        help: "Xray supports multiple protocols like VLESS, VMess, Trojan, and Shadowsocks."
                    },
                    listen: {
                        label: "Listen IP",
                        help: "IP address for the inbound to listen on. Default is 0.0.0.0 (all interfaces)."
                    },
                    tag: {
                        label: "Tag",
                        help: "A unique name for this inbound to refer to it in routing rules."
                    }
                }}
            />
        </Card>
    );
};