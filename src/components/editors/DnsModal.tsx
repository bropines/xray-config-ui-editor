import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { JsonField } from '../ui/JsonField'; // Импорт редактора

// Sub-components
import { DnsGeneral } from './dns/DnsGeneral';
import { DnsServers } from './dns/DnsServers';
import { DnsServerEditor } from './dns/DnsServerEditor';
import { DnsHosts } from './dns/DnsHosts';
import { DnsFakedns } from './dns/DnsFakedns';

export const DnsModal = ({ onClose }) => {
    const { config, updateSection } = useConfigStore();
    
    // Получаем секцию DNS и FakeDNS
    // FakeDNS в конфиге лежит отдельно, но мы редактируем его здесь.
    // В JSON режиме мы будем редактировать ТОЛЬКО объект "dns". 
    // FakeDNS придется оставить в табах или добавить логику слияния, но для простоты 
    // JSON режим DNS будет редактировать именно секцию "dns".
    const dns = config?.dns || {};
    const fakedns = config?.fakedns || []; 

    const [activeTab, setActiveTab] = useState<'general' | 'servers' | 'hosts' | 'fakedns'>('servers');
    const [editingServerIdx, setEditingServerIdx] = useState<number | null>(null);
    const [rawMode, setRawMode] = useState(false); // Состояние режима

    // Helpers
    const handleUpdateDns = (newDns) => {
        updateSection('dns', newDns);
    };

    // Server Actions
    const handleAddServer = (initialVal) => {
        const newServers = [...(dns.servers || []), initialVal];
        handleUpdateDns({ ...dns, servers: newServers });
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
    };

// --- JSON MODE VIEW ---
    if (rawMode) {
        // Создаем составной объект для редактирования
        const compositeConfig = {
            dns: dns,
            fakedns: fakedns
        };

        const handleCompositeUpdate = (newVal: any) => {
            if (!newVal) return;
            // Разбираем обратно и сохраняем в стор по отдельности
            if (newVal.dns) updateSection('dns', newVal.dns);
            if (newVal.fakedns) updateSection('fakedns', newVal.fakedns);
        };

        return (
            <Modal 
                title="DNS & FakeDNS (JSON)" 
                onClose={onClose} 
                onSave={() => onClose()} 
                extraButtons={
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">
                        Form Mode
                    </Button>
                }
            >
                <div className="h-[500px] flex flex-col gap-2">
                    <div className="bg-slate-800/50 border border-slate-700/50 p-2 rounded text-[10px] text-slate-400">
                        This editor manages both <code>dns</code> and <code>fakedns</code> root sections simultaneously.
                    </div>
                    <JsonField 
                        label="Combined Configuration" 
                        value={compositeConfig} 
                        onChange={handleCompositeUpdate} 
                        className="flex-1" 
                    />
                </div>
            </Modal>
        );
    }
    // --- FORM MODE VIEW ---
    return (
        <Modal 
            title="DNS Configuration" 
            onClose={onClose} 
            onSave={() => onClose()} 
            extraButtons={
                <div className="flex gap-4 items-center">
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button 
                            onClick={() => { setActiveTab('general'); setEditingServerIdx(null); }} 
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'general' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            General
                        </button>
                        <button 
                            onClick={() => { setActiveTab('servers'); setEditingServerIdx(null); }} 
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'servers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Servers
                        </button>
                        <button 
                            onClick={() => { setActiveTab('hosts'); setEditingServerIdx(null); }} 
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'hosts' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Hosts
                        </button>
                        <button 
                            onClick={() => { setActiveTab('fakedns'); setEditingServerIdx(null); }} 
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'fakedns' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            FakeDNS
                        </button>
                    </div>
                    
                    {/* Кнопка переключения на JSON */}
                    <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="Code">
                        JSON
                    </Button>
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

                {/* --- FAKEDNS TAB --- */}
                {activeTab === 'fakedns' && (
                    <div className="w-full max-w-2xl mx-auto">
                        <DnsFakedns 
                            fakedns={fakedns} 
                            onChange={(val) => updateSection('fakedns', val)} 
                        />
                    </div>
                )}

                {/* --- SERVERS TAB (Split View) --- */}
                {activeTab === 'servers' && (
                    <>
                        {/* List Column */}
                        <div className={`${editingServerIdx !== null ? 'w-1/3' : 'w-full max-w-2xl mx-auto'} transition-all duration-300 h-full`}>
                            <DnsServers 
                                servers={dns.servers} 
                                onSelect={setEditingServerIdx}
                                onAdd={handleAddServer}
                                onDelete={handleDeleteServer}
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