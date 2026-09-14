import React from 'react';
import { Card } from '../../ui/Card';
import { SchemaForm } from '../../ui/SchemaForm';
import { OutboundSchema, OutboundProtocolSchema } from '../../../core/xray/schemas';
import { t } from '../../../i18n';

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
        <Card title={t("Outbound Protocol")} icon="PaperPlaneTilt">
            <SchemaForm
                schema={OutboundSchema}
                value={outbound}
                onChange={handleFormChange}
                errors={errors}
                excludeKeys={['sendIP', 'streamSettings', 'settings', 'mux', 'proxySettings', 'targetStrategy']}
                fieldConfigs={{
                    protocol: {
                        label: t("Protocol"),
                        help: t("Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria, etc."),
                        options: OutboundProtocolSchema.options as unknown as string[]
                    },
                    tag: {
                        label: t("Tag"),
                        help: t("Unique name for this outbound (used in routing rules).")
                    }
                }}
            />
        </Card>
    );
};
