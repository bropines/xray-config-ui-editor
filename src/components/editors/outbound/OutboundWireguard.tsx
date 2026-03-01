import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export const OutboundWireguard = ({ outbound, onChange }: any) => {
    if (outbound.protocol !== 'wireguard') return null;

    const settings = outbound.settings || { secretKey: "", address: ["10.0.0.1/24"], peers: [] };

    const update = (field: string, value: any) => {
        onChange('settings', { ...settings, [field]: value });
    };

    const addPeer = () => {
        const peers = settings.peers || [];
        update('peers', [...peers, { endpoint: "", publicKey: "", keepAlive: 0 }]);
    };

    const updatePeer = (idx: number, field: string, val: any) => {
        const peers = [...(settings.peers || [])];
        peers[idx] = { ...peers[idx], [field]: val };
        update('peers', peers);
    };

    const removePeer = (idx: number) => {
        const peers = [...(settings.peers || [])];
        peers.splice(idx, 1);
        update('peers', peers);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 space-y-4">
            <h4 className="label-xs text-slate-400 border-b border-slate-800 pb-2">WireGuard Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label-xs">Secret Key</label>
                    <input className="input-base font-mono text-xs text-rose-300" 
                        value={settings.secretKey || ""} 
                        onChange={e => update('secretKey', e.target.value)} 
                        placeholder="Private Key" />
                </div>
                <div>
                    <label className="label-xs">Local Address (CIDR)</label>
                    <input className="input-base font-mono text-xs" 
                        value={(settings.address || []).join(', ')} 
                        onChange={e => update('address', e.target.value.split(',').map((s: string) => s.trim()))} 
                        placeholder="10.0.0.1/24, fd00::1/64" />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="label-xs">Peers</label>
                    <Button variant="ghost" onClick={addPeer} className="px-2 py-1 text-[10px]" icon="Plus">Add Peer</Button>
                </div>
                <div className="space-y-2">
                    {(settings.peers || []).map((peer: any, i: number) => (
                        <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-700 flex flex-col gap-2 relative group">
                            <button onClick={() => removePeer(i)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon name="Trash" />
                            </button>
                            <div className="grid grid-cols-2 gap-2 pr-6">
                                <div>
                                    <label className="label-xs text-[9px]">Endpoint</label>
                                    <input className="input-base font-mono text-xs" value={peer.endpoint || ""} onChange={e => updatePeer(i, 'endpoint', e.target.value)} placeholder="engage.cloudflareclient.com:2408" />
                                </div>
                                <div>
                                    <label className="label-xs text-[9px]">Public Key</label>
                                    <input className="input-base font-mono text-xs text-emerald-300" value={peer.publicKey || ""} onChange={e => updatePeer(i, 'publicKey', e.target.value)} placeholder="Public Key" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {(settings.peers || []).length === 0 && <div className="text-xs text-slate-500 text-center py-2 italic">No peers added</div>}
                </div>
            </div>
        </div>
    );
};