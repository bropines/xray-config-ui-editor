import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon';

// Sub-components
import { DnsGeneral } from './dns/DnsGeneral';
import { DnsServers } from './dns/DnsServers';
import { DnsServerEditor } from './dns/DnsServerEditor';
import { DnsHosts } from './dns/DnsHosts';

export const DnsModal = ({ onClose }) => {
    const { config, updateSection } = useConfigStore();
    const dns = config?.dns || {};

    const [activeTab, setActiveTab] = useState<'general' | 'servers' | 'hosts'>('servers');
    const [editingServerIdx, setEditingServerIdx] = useState<number | null>(null);

    // Helpers
    const handleUpdateDns = (newDns) => {
        updateSection('dns', newDns);
    };

    // Server Actions
    const handleAddServer = (initialVal) => {
        const newServers = [...(dns.servers || []), initialVal];
        handleUpdateDns({ ...dns, servers: newServers });
        // Если добавляем сложный - сразу открываем редактор
        if (typeof initialVal !== 'string') setEditingServerIdx(newServers.length - 1);
    };

    const handleDeleteServer = (idx) => {
        const newServers = [...(dns.servers || [])];
        newServers.splice(idx, 1);
        handleUpdateDns({ ...dns, servers: newServers });
        if (editingServerIdx === idx) setEditingServerIdx(null);
    };

    const handleUpdateServer = (val) => {
        if (editingServerIdx === null) return;
        const newServers = [...(dns.servers || [])];
        newServers[editingServerIdx] = val;
        handleUpdateDns({ ...dns, servers: newServers });
        // Не закрываем редактор сразу, даем возможность юзеру нажать "Save & Close"
    };

    return (
        <Modal 
            title="DNS Configuration" 
            onClose={onClose} 
            onSave={() => onClose()} // Auto-save via store
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => { setActiveTab('general'); setEditingServerIdx(null); }} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'general' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>General</button>
                    <button onClick={() => { setActiveTab('servers'); setEditingServerIdx(null); }} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'servers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Servers</button>
                    <button onClick={() => { setActiveTab('hosts'); setEditingServerIdx(null); }} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'hosts' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Hosts</button>
                </div>
            }
        >
            <div className="h-[500px] flex gap-6">
                
                {/* --- GENERAL TAB --- */}
                {activeTab === 'general' && (
                    <div className="w-full max-w-2xl mx-auto">
                        <DnsGeneral dns={dns} onChange={handleUpdateDns} />
                    </div>
                )}

                {/* --- HOSTS TAB --- */}
                {activeTab === 'hosts' && (
                    <div className="w-full max-w-2xl mx-auto">
                        <DnsHosts hosts={dns.hosts} onChange={h => handleUpdateDns({...dns, hosts: h})} />
                    </div>
                )}

{/* --- SERVERS TAB --- */}
{activeTab === 'servers' && (
    <>
        <div className={`${editingServerIdx !== null ? 'w-1/3' : 'w-full max-w-2xl mx-auto'} transition-all duration-300 h-full`}>
            <DnsServers 
                servers={dns.servers} 
                onSelect={setEditingServerIdx}
                onAdd={handleAddServer}
                onDelete={handleDeleteServer}
                // Добавляем обработчик перетаскивания
                onReorder={(newServers) => handleUpdateDns({ ...dns, servers: newServers })}
            />
        </div>

                        {/* Editor Column */}
                        {editingServerIdx !== null && (
                            <div className="flex-1 animate-in slide-in-from-right-4 fade-in duration-300">
                                <DnsServerEditor 
                                    server={dns.servers?.[editingServerIdx]} 
                                    onChange={handleUpdateServer}
                                    onCancel={() => setEditingServerIdx(null)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};