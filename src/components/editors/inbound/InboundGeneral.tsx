import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Select } from '../../ui/Select';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    const isTun = inbound.protocol === 'tun';

    return (
        <Card title="Inbound Connectivity" icon="Globe">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="Protocol" help="Xray supports multiple protocols like VLESS, VMess, Trojan, and Shadowsocks.">
                    <Select 
                        value={inbound.protocol} 
                        onChange={val => onProtocolChange(val)}
                        options={[
                            { value: "vless", label: "VLESS", description: "Modern, secure protocol" },
                            { value: "vmess", label: "VMess", description: "Standard secure protocol" },
                            { value: "trojan", label: "Trojan", description: "Simulates HTTPS traffic" },
                            { value: "shadowsocks", label: "Shadowsocks", description: "Classic lightweight proxy" },
                            { value: "hysteria", label: "Hysteria 2", description: "UDP-based high speed" },
                            { value: "socks", label: "SOCKS", description: "Standard proxy protocol" },
                            { value: "http", label: "HTTP", description: "Insecure web proxy" },
                            { value: "dokodemo-door", label: "Dokodemo", description: "Transparent redirection" },
                            { value: "tun", label: "TUN", description: "Transparent system adapter" },
                        ]}
                    />
                </FormField>

                {!isTun && (
                    <FormField label="Port" error={errors.port}>
                        <input 
                            type="number" 
                            className="input-base"
                            value={inbound.port} 
                            onChange={e => onChange('port', parseInt(e.target.value) || 0)} 
                        />
                    </FormField>
                )}

                {!isTun && (
                    <FormField label="Listen IP" help="IP address for the inbound to listen on. Default is 0.0.0.0 (all interfaces).">
                        <input 
                            className="input-base"
                            placeholder="0.0.0.0" 
                            value={inbound.listen || ""} 
                            onChange={e => onChange('listen', e.target.value)} 
                        />
                    </FormField>
                )}

                <FormField label="Tag" help="A unique name for this inbound to refer to it in routing rules." error={errors.tag}>
                    <input 
                        className="input-base"
                        value={inbound.tag} 
                        onChange={e => onChange('tag', e.target.value)} 
                    />
                </FormField>
            </div>
        </Card>
    );
};