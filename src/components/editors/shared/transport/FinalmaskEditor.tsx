import React from 'react';
import { FormField } from '../../../ui/FormField';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';

export const FinalmaskEditor = ({ finalmask = {}, onChange }: any) => {
    const updateField = (field: string, value: any) => {
        onChange({ ...finalmask, [field]: value });
    };

    const addNoise = (proto: 'tcp' | 'udp') => {
        const noise = [...(finalmask[proto] || [])];
        noise.push({
            type: "noise",
            settings: {
                noise: [{ type: "rand", rand: "10-20", delay: "1-2" }]
            }
        });
        updateField(proto, noise);
    };

    const removeNoise = (proto: 'tcp' | 'udp', index: number) => {
        const noise = [...(finalmask[proto] || [])];
        noise.splice(index, 1);
        updateField(proto, noise);
    };

    const updateNoiseSettings = (proto: 'tcp' | 'udp', index: number, field: string, value: any) => {
        const noise = [...(finalmask[proto] || [])];
        const settings = { ...noise[index].settings };
        const innerNoise = [...settings.noise];
        innerNoise[0] = { ...innerNoise[0], [field]: value };
        settings.noise = innerNoise;
        noise[index] = { ...noise[index], settings };
        updateField(proto, noise);
    };

    const renderNoiseList = (proto: 'tcp' | 'udp') => (
        <div className="space-y-4 mt-2">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.1em]">{proto.toUpperCase()} Noise</span>
                <Button size="xs" variant="secondary" onClick={() => addNoise(proto)} icon="Plus">Add Rule</Button>
            </div>
            {(finalmask[proto] || []).map((item: any, i: number) => {
                const n = item.settings?.noise?.[0] || {};
                return (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 relative group animate-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                            <FormField label="Type">
                                <Select 
                                    size="sm"
                                    value={n.type || "rand"}
                                    onChange={e => updateNoiseSettings(proto, i, 'type', e.target.value)}
                                >
                                    <option value="rand">Random</option>
                                    <option value="hex">Hexadecimal</option>
                                </Select>
                            </FormField>
                            <FormField label={n.type === 'hex' ? 'Packet (Hex)' : 'Range (Bytes)'}>
                                <Input 
                                    className="font-mono text-xs" 
                                    value={n.rand || n.packet || ""} 
                                    onChange={e => updateNoiseSettings(proto, i, n.type === 'hex' ? 'packet' : 'rand', e.target.value)}
                                    placeholder={n.type === 'hex' ? "aabbcc" : "10-20"}
                                />
                            </FormField>
                            <FormField label="Delay (ms)">
                                <Input 
                                    className="font-mono text-xs" 
                                    value={n.delay || ""} 
                                    onChange={e => updateNoiseSettings(proto, i, 'delay', e.target.value)}
                                    placeholder="1-2"
                                />
                            </FormField>
                        </div>
                        <button 
                            onClick={() => removeNoise(proto, i)}
                            className="absolute top-3 right-3 text-slate-600 hover:text-rose-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-500/10"
                        >
                            <Icon name="Trash" />
                        </button>
                    </div>
                );
            })}
            {(finalmask[proto] || []).length === 0 && (
                <div className="text-[10px] text-slate-600 italic text-center py-4 bg-slate-900/20 rounded-xl border border-dashed border-slate-800/50">
                    No noise rules for {proto.toUpperCase()}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 pt-6 border-t border-slate-800/80 mt-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Icon name="Waves" weight="fill" className="text-indigo-400 text-lg" />
                </div>
                <div>
                    <h5 className="text-xs font-black text-white uppercase tracking-widest">Finalmask / Noise</h5>
                    <p className="text-[10px] text-slate-500 font-medium">Anti-DPI noise packet simulation</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderNoiseList('tcp')}
                {renderNoiseList('udp')}
            </div>
        </div>
    );
};
