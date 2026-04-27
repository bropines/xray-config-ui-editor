import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Icon } from '../../ui/Icon';

export const OutboundGeneral = ({ outbound, onChange, onProtocolChange, errors = {} }: any) => {
    return (
        <Card title="Outbound Protocol" icon="PaperPlaneTilt" iconColor="bg-blue-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Protocol" help="Standard Xray outbound protocols.">
                    <Select 
                        value={outbound.protocol} 
                        onChange={e => onProtocolChange(e.target.value)}
                        className="font-black text-indigo-400"
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
                    </Select>
                </FormField>

                <FormField label="Unique Tag" help="Name used in routing rules." error={errors.tag}>
                    <div className="relative group/input">
                        <Input 
                            placeholder="e.g. proxy-out"
                            value={outbound.tag || ""} 
                            onChange={e => onChange('tag', e.target.value)}
                            className="font-bold"
                        />
                        <Icon name="Tag" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/input:text-indigo-500 transition-colors" />
                    </div>
                </FormField>
            </div>
        </Card>
    );
};
