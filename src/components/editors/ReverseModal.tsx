import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useConfigStore } from '../../store/configStore';

export const ReverseModal = ({ onClose }) => {
    const { config, updateSection } = useConfigStore();
    const reverse = config?.reverse || { bridges: [], portals: [] };
    const [activeTab, setActiveTab] = useState<'bridges' | 'portals'>('bridges');

    const updateList = (type: 'bridges' | 'portals', newList: any[]) => {
        updateSection('reverse', { ...reverse, [type]: newList });
    };

    const addItem = (type: 'bridges' | 'portals') => {
        updateList(type, [...(reverse[type] || []), { tag: "reverse-" + type, domain: "example.com" }]);
    };

    const removeItem = (type: 'bridges' | 'portals', idx: number) => {
        const n = [...(reverse[type] || [])];
        n.splice(idx, 1);
        updateList(type, n);
    };

    const updateItem = (type: 'bridges' | 'portals', idx: number, field: string, val: string) => {
        const n = [...(reverse[type] || [])];
        n[idx] = { ...n[idx], [field]: val };
        updateList(type, n);
    };

    const renderList = (type: 'bridges' | 'portals') => (
        <div className="space-y-3">
            {(reverse[type] || []).map((item, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl grid grid-cols-2 gap-4 relative group">
                    <div>
                        <label className="label-xs">Tag</label>
                        <input className="input-base" 
                            value={item.tag} 
                            onChange={e => updateItem(type, i, 'tag', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">Domain</label>
                        <input className="input-base font-mono" 
                            value={item.domain} 
                            onChange={e => updateItem(type, i, 'domain', e.target.value)}
                        />
                    </div>
                    <button onClick={() => removeItem(type, i)} className="absolute -top-2 -right-2 bg-slate-800 border border-slate-700 p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:border-rose-500 transition-all opacity-0 group-hover:opacity-100 shadow-lg">
                        <Icon name="Trash" weight="bold" />
                    </button>
                </div>
            ))}
            {(reverse[type] || []).length === 0 && (
                <div className="text-center py-12 text-slate-600 text-sm">
                    No {type} configured.
                </div>
            )}
            <Button variant="secondary" className="w-full mt-4" onClick={() => addItem(type)} icon="Plus">
                Add {type === 'bridges' ? 'Bridge' : 'Portal'}
            </Button>
        </div>
    );

    return (
        <Modal 
            title="Reverse Proxy" 
            onClose={onClose} 
            onSave={() => onClose()}
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('bridges')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'bridges' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}>Bridges</button>
                    <button onClick={() => setActiveTab('portals')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'portals' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>Portals</button>
                </div>
            }
        >
            <div className="max-w-2xl mx-auto h-[500px] overflow-y-auto custom-scroll p-1">
                {activeTab === 'bridges' && renderList('bridges')}
                {activeTab === 'portals' && renderList('portals')}
                
                <div className="mt-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                    <h4 className="font-bold flex items-center gap-2 mb-2"><Icon name="Info" /> How it works</h4>
                    <p className="opacity-80">
                        <b>Bridge:</b> Active end (usually behind NAT). Connects to Portal.<br/>
                        <b>Portal:</b> Passive end (public server). Accepts connection from Bridge.
                    </p>
                </div>
            </div>
        </Modal>
    );
};