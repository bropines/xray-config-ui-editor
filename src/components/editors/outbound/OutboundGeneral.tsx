import React from 'react';
import { Card } from '../../ui/Card';
import { SchemaForm } from '../../ui/SchemaForm';
import { OutboundSchema } from '../../../core/xray/schemas';

export const OutboundGeneral = ({ outbound, onChange, onProtocolChange, errors = {} }: any) => {
    const handleFormChange = (newOutbound: any) => {
        if (newOutbound.protocol !== outbound.protocol) {
            onProtocolChange(newOutbound.protocol);
        }
        
        // Find modified or added keys
        Object.keys(newOutbound).forEach(key => {
            if (newOutbound[key] !== outbound[key]) {
                onChange(key, newOutbound[key]);
            }
        });
        
        // Find deleted keys
        Object.keys(outbound).forEach(key => {
            if (newOutbound[key] === undefined && outbound[key] !== undefined) {
                onChange(key, undefined);
            }
        });
    };

    return (
        <Card title="Outbound Protocol" icon="PaperPlaneTilt">
            <SchemaForm
                schema={OutboundSchema}
                value={outbound}
                onChange={handleFormChange}
                errors={errors}
                excludeKeys={['sendIP', 'streamSettings', 'settings', 'mux']}
                fieldConfigs={{
                    protocol: {
                        label: "Protocol",
                        help: "Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria, etc."
                    },
                    tag: {
                        label: "Tag",
                        help: "Unique name for this outbound (used in routing rules)."
                    }
                }}
            />
        </Card>
    );
};
