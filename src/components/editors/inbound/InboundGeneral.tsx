import React from 'react';
import { Card } from '../../ui/Card';
import { SchemaField } from '../../ui/SchemaField';
import { InboundSchema } from '../../../core/xray/schemas';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    const isTun = inbound.protocol === 'tun';
    const shape = InboundSchema.shape;

    return (
        <Card title="Inbound Connectivity" icon="Globe">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <SchemaField
                    name="protocol"
                    schema={shape.protocol}
                    value={inbound.protocol}
                    onChange={val => onProtocolChange(val)}
                    error={errors.protocol}
                    label="Protocol"
                    help="Xray supports multiple protocols like VLESS, VMess, Trojan, and Shadowsocks."
                />

                {!isTun && (
                    <SchemaField
                        name="port"
                        schema={shape.port}
                        value={inbound.port}
                        onChange={val => onChange('port', val)}
                        error={errors.port}
                        label="Port"
                    />
                )}

                {!isTun && (
                    <SchemaField
                        name="listen"
                        schema={shape.listen}
                        value={inbound.listen || ""}
                        onChange={val => onChange('listen', val)}
                        error={errors.listen}
                        label="Listen IP"
                        help="IP address for the inbound to listen on. Default is 0.0.0.0 (all interfaces)."
                    />
                )}

                <SchemaField
                    name="tag"
                    schema={shape.tag}
                    value={inbound.tag}
                    onChange={val => onChange('tag', val)}
                    error={errors.tag}
                    label="Tag"
                    help="A unique name for this inbound to refer to it in routing rules."
                />
            </div>
        </Card>
    );
};