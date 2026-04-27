import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';

export const OutboundGeneral = ({ outbound, onChange, onProtocolChange, errors = {} }: any) => {
    return (
        <Card title="Outbound Protocol" icon="PaperPlaneTilt">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Protocol" help="Xray supports VLESS, VMess, Trojan, Shadowsocks, Hysteria2, etc.">
                    <select 
                        className="input-base font-bold text-indigo-400"
                        value={outbound.protocol} 
                        onChange={e => onProtocolChange(e.target.value)}
                    >
                        <option value="vless">VLESS</option>
                        <option value="vmess">VMess</option>
                        <option value="trojan">Trojan</option>
                        <option value="shadowsocks">Shadowsocks</option>
                        <option value="socks">Socks</option>
                        <option value="http">HTTP</option>
                        <option value="wireguard">WireGuard</option>
                        <option value="hysteria2">Hysteria 2</option>
                        <option value="tuic">TUIC</option>
                        <option value="freedom">Freedom (Direct)</option>
                        <option value="blackhole">Blackhole (Block)</option>
                        <option value="dns">DNS</option>
                    </select>
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
