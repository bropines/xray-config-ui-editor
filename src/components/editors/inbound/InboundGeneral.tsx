import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';

export const InboundGeneral = ({ inbound, onChange, onProtocolChange, errors = {} }: any) => {
    const isTun = inbound.protocol === 'tun';

    return (
        <Card title="Inbound Connectivity" icon="Globe">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="Protocol" help="Xray supports multiple protocols like VLESS, VMess, Trojan, and Shadowsocks.">
                    <select 
                        className="input-base font-bold text-indigo-400"
                        value={inbound.protocol} 
                        onChange={e => onProtocolChange(e.target.value)}
                    >
                        <option value="vless">VLESS</option>
                        <option value="vmess">VMess</option>
                        <option value="trojan">Trojan</option>
                        <option value="shadowsocks">Shadowsocks</option>
                        <option value="hysteria2">Hysteria 2</option>
                        <option value="socks">Socks</option>
                        <option value="http">HTTP</option>
                        <option value="dokodemo-door">Dokodemo</option>
                        <option value="tun">TUN (Transparent)</option> 
                    </select>
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