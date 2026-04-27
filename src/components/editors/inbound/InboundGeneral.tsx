import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Icon } from '../../ui/Icon';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    return (
        <Card title="Inbound Connectivity" icon="Link" iconColor="bg-indigo-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Unique Tag" error={errors.tag} help="A unique identifier for this inbound.">
                    <div className="relative group/input">
                        <Input 
                            placeholder="e.g. proxy-in"
                            value={inbound.tag || ""} 
                            onChange={e => onChange('tag', e.target.value)}
                            className="font-bold"
                        />
                        <Icon name="Tag" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/input:text-indigo-500 transition-colors" />
                    </div>
                </FormField>

                <FormField label="Protocol" help="Xray protocol for this inbound.">
                    <Select 
                        value={inbound.protocol || "vless"} 
                        onChange={e => onProtocolChange(e.target.value)}
                    >
                        <option value="vless">VLESS (Recommended)</option>
                        <option value="vmess">VMess</option>
                        <option value="trojan">Trojan</option>
                        <option value="shadowsocks">Shadowsocks</option>
                        <option value="socks">SOCKS</option>
                        <option value="http">HTTP</option>
                        <option value="dokodemo-door">Dokodemo-door</option>
                        <option value="tun">TUN Interface</option>
                    </Select>
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2">
                    <FormField label="Listen Address" help="IP to listen on (0.0.0.0 for all interfaces).">
                        <Input 
                            placeholder="0.0.0.0"
                            value={inbound.listen || ""} 
                            onChange={e => onChange('listen', e.target.value)} 
                        />
                    </FormField>
                </div>
                <FormField label="Port" error={errors.port} help="Port number or range.">
                    <Input 
                        type="number"
                        placeholder="10085"
                        value={inbound.port || ""} 
                        onChange={e => onChange('port', parseInt(e.target.value) || 0)}
                        className="font-black text-indigo-400"
                    />
                </FormField>
            </div>
        </Card>
    );
};
