import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';

export const InboundSniffing = ({ sniffing, onChange }: any) => {
    const enabled = sniffing?.enabled || false;
    const destOverride = sniffing?.destOverride || [];

    const toggleType = (type: string) => {
        if (destOverride.includes(type)) {
            onChange(['sniffing', 'destOverride'], destOverride.filter((t: string) => t !== type));
        } else {
            onChange(['sniffing', 'destOverride'], [...destOverride, type]);
        }
    };

    return (
        <Card title="Traffic Sniffing" icon="MagnifyingGlass" className="mt-4">
            <div className="space-y-4">
                <FormField label="Enable Sniffing" help="Analyze traffic to determine destination domain and protocol." horizontal>
                    <Switch 
                        checked={enabled} 
                        onChange={(val) => onChange(['sniffing', 'enabled'], val)} 
                    />
                </FormField>

                {enabled && (
                    <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Destination Overrides</label>
                            <div className="flex flex-wrap gap-2">
                                {['http', 'tls', 'quic', 'fakedns', 'fakedns+others'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleType(type)}
                                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                            destOverride.includes(type)
                                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                                : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'
                                        }`}
                                    >
                                        {type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Metadata Only" help="Sniff only connection metadata (faster, less accurate)." horizontal>
                                <Switch 
                                    checked={sniffing?.metadataOnly || false} 
                                    onChange={(val) => onChange(['sniffing', 'metadataOnly'], val)} 
                                />
                            </FormField>
                            <FormField label="Route Only" help="Use sniffed domain only for routing, not for DNS." horizontal>
                                <Switch 
                                    checked={sniffing?.routeOnly || false} 
                                    onChange={(val) => onChange(['sniffing', 'routeOnly'], val)} 
                                />
                            </FormField>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
