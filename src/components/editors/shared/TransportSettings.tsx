import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';

// Modular Transport Editors
import { RealityEditor } from './transport/RealityEditor';
import { TlsEditor } from './transport/TlsEditor';
import { WsEditor } from './transport/WsEditor';
import { HttpUpgradeEditor } from './transport/HttpUpgradeEditor';
import { XhttpEditor } from './transport/XhttpEditor';
import { GrpcEditor } from './transport/GrpcEditor';
import { QuicEditor } from './transport/QuicEditor';
import { FinalmaskEditor } from './transport/FinalmaskEditor';

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...streamSettings, [field]: value });
    };

    const network = streamSettings.network || "tcp";
    const security = streamSettings.security || "none";

    return (
        <Card title="Transport Settings" icon="ArrowsLeftRight" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Network Protocol" help="Underlying transport protocol (TCP, WS, etc.)">
                    <Select 
                        className="font-bold text-indigo-400"
                        value={network} 
                        onChange={e => updateField('network', e.target.value)}
                    >
                        <option value="tcp">TCP (Standard)</option>
                        <option value="kcp">mKCP (UDP)</option>
                        <option value="ws">WebSocket</option>
                        <option value="http">HTTP/2</option>
                        <option value="quic">QUIC</option>
                        <option value="grpc">gRPC</option>
                        <option value="httpupgrade">HTTP Upgrade</option>
                        <option value="xhttp">Xhttp</option>
                    </Select>
                </FormField>

                <FormField label="Security Layer" help="Encryption layer (TLS, Reality).">
                    <Select 
                        className="font-bold text-indigo-400"
                        value={security} 
                        onChange={e => updateField('security', e.target.value)}
                    >
                        <option value="none">None (Plaintext)</option>
                        <option value="tls">TLS / SSL</option>
                        <option value="reality">Reality (Stealth)</option>
                    </Select>
                </FormField>
            </div>

            {/* --- Security Layer Editors --- */}
            {security === 'tls' && (
                <div className="pt-5 mt-5 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Icon name="Lock" weight="bold" />
                        </div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TLS Configuration</h5>
                    </div>
                    <TlsEditor 
                        tls={streamSettings.tlsSettings || {}} 
                        onChange={(v: any) => updateField('tlsSettings', v)} 
                    />
                </div>
            )}

            {security === 'reality' && (
                <div className="pt-5 mt-5 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Icon name="ShieldCheck" weight="bold" />
                        </div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reality Stealth</h5>
                    </div>
                    <RealityEditor 
                        isClient={isClient}
                        reality={streamSettings.realitySettings || {}} 
                        onChange={(v: any) => updateField('realitySettings', v)} 
                    />
                </div>
            )}

            {/* --- Network Protocol Editors --- */}
            <div className="pt-5 mt-5 border-t border-slate-800/80 animate-in fade-in">
                {network === 'ws' && (
                    <WsEditor 
                        ws={streamSettings.wsSettings || {}} 
                        onChange={(v: any) => updateField('wsSettings', v)} 
                    />
                )}
                {network === 'httpupgrade' && (
                    <HttpUpgradeEditor 
                        settings={streamSettings.httpupgradeSettings || {}} 
                        onChange={(v: any) => updateField('httpupgradeSettings', v)} 
                    />
                )}
                {network === 'xhttp' && (
                    <XhttpEditor 
                        settings={streamSettings.xhttpSettings || {}} 
                        onChange={(v: any) => updateField('xhttpSettings', v)} 
                    />
                )}
                {network === 'grpc' && (
                    <GrpcEditor 
                        settings={streamSettings.grpcSettings || {}} 
                        onChange={(v: any) => updateField('grpcSettings', v)} 
                    />
                )}
                {network === 'quic' && (
                    <QuicEditor 
                        settings={streamSettings.quicSettings || {}} 
                        onChange={(v: any) => updateField('quicSettings', v)} 
                    />
                )}
                {network === 'tcp' && (
                    <div className="py-4 text-center">
                        <p className="text-[10px] text-slate-600 italic font-medium uppercase tracking-tighter">Standard TCP transport. No extra configuration required.</p>
                    </div>
                )}
                {network === 'kcp' && (
                    <div className="py-4 text-center">
                        <p className="text-[10px] text-slate-600 italic font-medium uppercase tracking-tighter">mKCP transport. Advanced settings available in JSON mode.</p>
                    </div>
                )}
            </div>

            {/* --- Finalmask (Noise) Settings --- */}
            <FinalmaskEditor 
                finalmask={streamSettings.finalmask || {}} 
                onChange={(v: any) => updateField('finalmask', v)} 
            />
        </Card>
    );
};
