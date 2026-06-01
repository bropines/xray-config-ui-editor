import React from 'react';
import { Button, Icon, SchemaForm } from '../../ui';
import { FakeDnsPoolSchema } from '../../../core/xray/schemas/fakedns.schema';

export const DnsFakedns = ({ fakedns = [], onChange }: any) => {
    // fakedns - это массив объектов { ipPool, poolSize }

    const addPool = () => {
        onChange([...fakedns, { ipPool: "198.18.0.0/15", poolSize: 65535 }]);
    };

    const removePool = (idx: number) => {
        const n = [...fakedns];
        n.splice(idx, 1);
        onChange(n);
    };

    const updatePool = (idx: number, val: any) => {
        const n = [...fakedns];
        n[idx] = val;
        onChange(n);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <label className="label-xs">FakeDNS Pools</label>
                    <p className="text-[10px] text-slate-500">Virtual IP ranges for domains</p>
                </div>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addPool} icon="Plus">Add Pool</Button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pr-1">
                {fakedns.map((item, i) => (
                    <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex gap-4 items-end">
                        <div className="flex-1">
                            <SchemaForm
                                schema={FakeDnsPoolSchema}
                                value={item}
                                onChange={val => updatePool(i, val)}
                                fieldConfigs={{
                                    ipPool: {
                                        label: 'IP Pool (CIDR)',
                                        placeholder: '198.18.0.0/15',
                                        help: 'CIDR for FakeIP address pool.'
                                    },
                                    poolSize: {
                                        label: 'Size',
                                        placeholder: '65535',
                                        help: 'Maximum number of domain-IP mappings.'
                                    }
                                }}
                            />
                        </div>
                        <button onClick={() => removePool(i)} className="p-2.5 bg-slate-800 hover:bg-rose-600 rounded text-slate-400 hover:text-white transition-colors">
                            <Icon name="Trash" />
                        </button>
                    </div>
                ))}
                {fakedns.length === 0 && (
                    <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                        <p className="text-xs text-slate-500">No FakeDNS pools configured.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Add one if you use TProxy or want to hide DNS results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};