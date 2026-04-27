import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Icon } from '../../ui/Icon';
import { cn } from '../../ui/Button';

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
        <Card title="Traffic Sniffing" icon="MagnifyingGlass" iconColor="bg-amber-500" className="mt-6">
            <div className="space-y-6">
                <FormField 
                    label="Enable Sniffing" 
                    help="Analyze traffic to determine destination domain and protocol." 
                    horizontal
                    className="pb-2"
                >
                    <Switch 
                        checked={enabled} 
                        onChange={(val) => onChange(['sniffing', 'enabled'], val)} 
                    />
                </FormField>

                {enabled && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Column 1: Overrides */}
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Icon name="ArrowsLeftRight" weight="bold" />
                                Destination Overrides
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                                {['http', 'tls', 'quic', 'fakedns', 'fakedns+others'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleType(type)}
                                        className={cn(
                                            "px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all duration-300 text-center tracking-tighter",
                                            destOverride.includes(type)
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Advanced Options */}
                        <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Icon name="GearSix" weight="bold" />
                                Sniffing Logic
                            </h5>
                            <div className="space-y-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 shadow-inner">
                                <FormField label="Metadata Only" help="Sniff only connection metadata (faster, less accurate)." horizontal>
                                    <Switch 
                                        checked={sniffing?.metadataOnly || false} 
                                        onChange={(val) => onChange(['sniffing', 'metadataOnly'], val)} 
                                    />
                                </FormField>
                                <div className="h-px bg-slate-800/50 my-1" />
                                <FormField label="Route Only" help="Use sniffed domain only for routing, not for DNS." horizontal>
                                    <Switch 
                                        checked={sniffing?.routeOnly || false} 
                                        onChange={(val) => onChange(['sniffing', 'routeOnly'], val)} 
                                    />
                                </FormField>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
