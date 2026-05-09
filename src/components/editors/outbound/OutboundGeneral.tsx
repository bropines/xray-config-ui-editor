import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Select } from '../../ui/Select';

export const OutboundGeneral = ({ outbound, onChange, onProtocolChange, errors = {} }: any) => {
    return (
        <Card title="Outbound Protocol" icon="PaperPlaneTilt">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Protocol" help="Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria, etc.">
                    <Select 
                        value={outbound.protocol} 
                        onChange={val => onProtocolChange(val)}
                        options={[
                            { value: "vless", label: "VLESS", description: "Universal secure protocol" },
                            { value: "vmess", label: "VMess", description: "Traditional secure protocol" },
                            { value: "trojan", label: "Trojan", description: "Stealth HTTPS traffic" },
                            { value: "shadowsocks", label: "Shadowsocks", description: "Fast & lightweight" },
                            { value: "socks", label: "SOCKS", description: "Standard proxy" },
                            { value: "http", label: "HTTP", description: "Web proxy" },
                            { value: "wireguard", label: "WireGuard", description: "Modern UDP VPN" },
                            { value: "hysteria", label: "Hysteria 2", description: "Brutal speed over UDP" },
                            { value: "tuic", label: "TUIC", description: "QUIC-based protocol" },
                            { value: "freedom", label: "Freedom (Direct)", description: "Bypass proxy (Direct IP)" },
                            { value: "blackhole", label: "Blackhole (Block)", description: "Silently drop traffic" },
                            { value: "dns", label: "DNS (Server)", description: "Internal DNS handling" },
                        ]}
                    />
                </FormField>

                <FormField label="Tag" help="Unique name for this outbound (used in routing rules)." error={errors.tag}>
                    <input 
                        className="input-base" 
                        value={outbound.tag || ""} 
                        onChange={e => onChange('tag', e.target.value)} 
                    />
                </FormField>
            </div>
        </Card>
    );
};
