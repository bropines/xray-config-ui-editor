import React from 'react';
import { Card } from '../../ui/Card';
import { SchemaField } from '../../ui/SchemaField';
import { OutboundSchema } from '../../../core/xray/schemas';

export const OutboundGeneral = ({ outbound, onChange, onProtocolChange, errors = {} }: any) => {
    const shape = OutboundSchema.shape;

    return (
        <Card title="Outbound Protocol" icon="PaperPlaneTilt">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SchemaField
                    name="protocol"
                    schema={shape.protocol}
                    value={outbound.protocol}
                    onChange={val => onProtocolChange(val)}
                    error={errors.protocol}
                    label="Protocol"
                    help="Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria, etc."
                />

                <SchemaField
                    name="tag"
                    schema={shape.tag}
                    value={outbound.tag || ""}
                    onChange={val => onChange('tag', val)}
                    error={errors.tag}
                    label="Tag"
                    help="Unique name for this outbound (used in routing rules)."
                />
            </div>
        </Card>
    );
};
