import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { SmartTagInput } from '../../ui/SmartTagInput';
import { getDefaultGeoList } from '../../../utils/geo-data';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { Switch } from '../../ui/Switch';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';

export const DnsServerEditor = ({ server, onChange, onCancel }: any) => {
    const isString = typeof server === 'string';
    const [local, setLocal] = useState(isString ? { address: server } : { ...server });

    const [geoSites, setGeoSites] = useState([]);
    const [geoIps, setGeoIps] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        if (!isString) { 
            let isMounted = true;
            setLoadingGeo(true);
            Promise.all([
                getDefaultGeoList('geosite'),
                getDefaultGeoList('geoip')
            ]).then(([sites, ips]) => {
                if (isMounted) {
                    setGeoSites(sites);
                    setGeoIps(ips);
                    setLoadingGeo(false);
                }
            });
            return () => { isMounted = false; };
        }
    }, [isString]);

    const update = (field: string, val: any) => {
        setLocal((prev: any) => ({ ...prev, [field]: val }));
    };

    const convertToAdvanced = () => {
        onChange({ address: server, domains: [], expectIPs: [] });
    };

    if (isString) {
        return (
            <Card title="Simple DNS Server" icon="Globe" iconColor="bg-slate-700" className="animate-in fade-in duration-300">
                <div className="space-y-6">
                    <FormField label="Server Address" help="IP or URL of the DNS server.">
                        <Input 
                            className="font-mono" 
                            value={server} 
                            onChange={e => onChange(e.target.value)} 
                            placeholder="e.g. 8.8.8.8"
                        />
                    </FormField>
                    <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/20 text-center space-y-4 shadow-inner">
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Need domain-specific routing or forced IP expectations?</p>
                        <Button variant="outline" color="info" size="sm" className="w-full" onClick={convertToAdvanced}>
                            Switch to Advanced Mode
                        </Button>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="ghost" size="sm" onClick={onCancel} icon="Check">Done</Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center px-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Icon name="GearSix" weight="fill" className="text-xl" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Advanced DNS</h3>
                </div>
                <Button variant="success" size="sm" onClick={() => onChange(local)} icon="FloppyDisk">Save</Button>
            </div>

            <div className="overflow-y-auto custom-scroll flex-1 space-y-8 pr-2 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <FormField label="Server Address">
                            <Input className="font-mono" value={local.address || ""} onChange={e => update('address', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Port">
                        <Input type="number" className="font-mono" value={local.port || ""} onChange={e => update('port', parseInt(e.target.value) || undefined)} placeholder="53" />
                    </FormField>
                </div>

                <div className="space-y-6">
                    <SmartTagInput 
                        label="Domain Filtering (geosite)" 
                        prefix="geosite:" 
                        placeholder="e.g. geosite:google, youtube.com" 
                        value={local.domains || []} 
                        onChange={v => update('domains', v)}
                        suggestions={geoSites}
                        isLoading={loadingGeo}
                    />

                    <SmartTagInput 
                        label="Expected IPs (geoip)" 
                        prefix="geoip:" 
                        placeholder="e.g. geoip:cn" 
                        value={local.expectIPs || []} 
                        onChange={v => update('expectIPs', v)}
                        suggestions={geoIps}
                        isLoading={loadingGeo}
                    />
                </div>

                <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-slate-800/80 space-y-4 shadow-inner">
                    <FormField label="Skip Fallback" help="If enabled, this server will never be skipped even if it fails." horizontal>
                        <Switch checked={local.skipFallback || false} onChange={val => update('skipFallback', val)} />
                    </FormField>
                    <div className="h-px bg-slate-800/50" />
                    <FormField label="IPv4 Only" help="Force query for A records only." horizontal>
                        <Switch checked={local.queryStrategy === 'UseIPv4'} onChange={val => update('queryStrategy', val ? 'UseIPv4' : undefined)} />
                    </FormField>
                </div>
            </div>
        </div>
    );
};
