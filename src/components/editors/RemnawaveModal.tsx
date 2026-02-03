import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useConfigStore } from '../../store/configStore';
import { RemnawaveClient, type RemnawaveProfile } from '../../utils/remnawave-client';
import { toast } from 'sonner';

export const RemnawaveModal = ({ onClose }: { onClose: () => void }) => {
    const { 
        remnawave, 
        setRemnawaveCreds, 
        connectRemnawaveToken, 
        loadRemnawaveProfile 
    } = useConfigStore();
    
    // UI State
    const [loginMethod, setLoginMethod] = useState<'creds' | 'token'>('creds');
    const [step, setStep] = useState<'login' | 'select'>('login');
    const [loading, setLoading] = useState(false);

    // Form State
    const [url, setUrl] = useState(remnawave.url || "");
    const [username, setUsername] = useState(remnawave.username || "");
    const [password, setPassword] = useState("");
    const [apiToken, setApiToken] = useState("");
    
    // Profiles
    const [profiles, setProfiles] = useState<RemnawaveProfile[]>([]);

    // 1. Вход по логину/паролю
    const handleLoginCreds = async () => {
        if (!url || !username || !password) {
            toast.error("Please fill all fields");
            return;
        }
        setLoading(true);
        try {
            const client = new RemnawaveClient(url);
            const token = await client.login(username, password);
            setRemnawaveCreds(url, username, token);
            
            // Сразу грузим профили
            client.setToken(token);
            const loadedProfiles = await client.getConfigProfiles();
            setProfiles(loadedProfiles);
            setStep('select');
        } catch (e: any) {
            console.error(e);
            toast.error("Login failed", { description: e.message });
        } finally {
            setLoading(false);
        }
    };

    // 2. Вход по API токену
    const handleLoginToken = async () => {
        if (!url || !apiToken) {
            toast.error("Please fill URL and Token");
            return;
        }
        setLoading(true);
        try {
            // Сначала проверим токен, попробовав загрузить профили
            const client = new RemnawaveClient(url);
            client.setToken(apiToken);
            
            const loadedProfiles = await client.getConfigProfiles();
            
            // Если успех - сохраняем в стор
            connectRemnawaveToken(url, apiToken);
            
            setProfiles(loadedProfiles);
            setStep('select');
        } catch (e: any) {
            console.error(e);
            toast.error("Invalid Token or URL", { description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProfile = async (uuid: string) => {
        setLoading(true);
        await loadRemnawaveProfile(uuid);
        setLoading(false);
        onClose();
    };

    return (
        <Modal 
            title="Connect to Remnawave" 
            onClose={onClose} 
            className="max-w-md"
            onSave={onClose}
        >
            <div className="space-y-4">
                {step === 'login' ? (
                    <>
                        <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30 text-xs text-indigo-200 mb-4">
                            <p className="font-bold flex items-center gap-2"><Icon name="Warning" /> CORS Warning</p>
                            <p className="mt-1 opacity-80">
                                Since this is a static page, you must configure Nginx on your Remnawave server to allow CORS from this domain.
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mb-4">
                            <button 
                                onClick={() => setLoginMethod('creds')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${loginMethod === 'creds' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                            >
                                Credentials
                            </button>
                            <button 
                                onClick={() => setLoginMethod('token')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${loginMethod === 'token' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                            >
                                API Token
                            </button>
                        </div>

                        {/* Common: Panel URL */}
                        <div>
                            <label className="label-xs">Panel URL</label>
                            <input className="input-base" 
                                placeholder="https://panel.example.com" 
                                value={url} onChange={e => setUrl(e.target.value)} 
                            />
                        </div>

                        {/* Specific Fields */}
                        {loginMethod === 'creds' ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="label-xs">Username</label>
                                    <input className="input-base" 
                                        placeholder="admin" 
                                        value={username} onChange={e => setUsername(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="label-xs">Password</label>
                                    <input className="input-base" 
                                        type="password" 
                                        placeholder="••••••" 
                                        value={password} onChange={e => setPassword(e.target.value)} 
                                    />
                                </div>
                                <Button className="w-full mt-4" onClick={handleLoginCreds} disabled={loading}>
                                    {loading ? <Icon name="Spinner" className="animate-spin" /> : "Login & Fetch Profiles"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="label-xs">API Token (JWT or Key)</label>
                                    <input className="input-base font-mono" 
                                        type="password"
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..." 
                                        value={apiToken} onChange={e => setApiToken(e.target.value)} 
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Use a long-lived API token or a temporary Admin JWT.
                                    </p>
                                </div>
                                <Button className="w-full mt-4 bg-indigo-600" onClick={handleLoginToken} disabled={loading}>
                                    {loading ? <Icon name="Spinner" className="animate-spin" /> : "Connect via Token"}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h3 className="text-sm font-bold text-slate-300 mb-2">Select Config Profile</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scroll">
                            {profiles.map(p => (
                                <div key={p.uuid} 
                                    onClick={() => handleSelectProfile(p.uuid)}
                                    className="p-3 bg-slate-800 hover:bg-indigo-600 border border-slate-700 rounded-lg cursor-pointer transition-colors flex justify-between items-center group"
                                >
                                    <span className="font-mono text-sm text-slate-200 group-hover:text-white">{p.name}</span>
                                    <Icon name="ArrowRight" className="opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                            {profiles.length === 0 && (
                                <div className="text-center text-slate-500 py-4">No profiles found.</div>
                            )}
                        </div>
                        <Button variant="secondary" className="w-full mt-4" onClick={() => setStep('login')}>Back</Button>
                    </>
                )}
            </div>
        </Modal>
    );
};