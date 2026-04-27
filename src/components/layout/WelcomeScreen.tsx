import React from 'react';
import { Button, cn } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface WelcomeScreenProps {
    presets: any[];
    setConfig: (config: any) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setRemnawaveModalOpen: (open: boolean) => void;
}

export const WelcomeScreen = ({
    presets,
    setConfig,
    handleFileUpload,
    setRemnawaveModalOpen
}: WelcomeScreenProps) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto custom-scroll p-4">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-block p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mb-6 shadow-2xl shadow-indigo-500/10">
                    <Icon name="Planet" weight="fill" className="text-6xl text-indigo-400" />
                </div>
                <h1 className="text-4xl md:text-5xl text-white font-black mb-4 tracking-tighter uppercase">
                    Welcome to <span className="text-indigo-400">Xray GUI</span>
                </h1>
                <p className="text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
                    A professional editor for Xray-core. Drag & Drop your <code>config.json</code> anywhere or choose a template to begin.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                {presets.map((preset, i) => (
                    <div 
                        key={i} 
                        onClick={() => setConfig(preset.config as any)} 
                        className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-3xl p-6 cursor-pointer transition-all group shadow-xl hover:shadow-indigo-500/10 flex flex-col gap-4 active:scale-95"
                    >
                        <div className="bg-slate-950 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors shadow-inner">
                            <Icon name={preset.icon} className="text-3xl" weight="duotone" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-100 group-hover:text-white mb-1.5 uppercase tracking-wide text-sm">{preset.name}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{preset.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 flex flex-col items-center gap-6 opacity-60 hover:opacity-100 transition-opacity pb-12 animate-in fade-in duration-1000 delay-500">
                <div className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-600">Or import from existing sources</div>
                <div className="flex gap-4">
                    <label className="text-xs font-bold text-slate-400 cursor-pointer flex items-center gap-2.5 hover:text-indigo-400 transition-colors bg-slate-900 border border-slate-800 px-6 py-3 rounded-full hover:border-indigo-500/30">
                        <Icon name="FolderOpen" weight="bold" /> Local File
                        <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                    <button 
                        onClick={() => setRemnawaveModalOpen(true)} 
                        className="text-xs font-bold text-slate-400 cursor-pointer flex items-center gap-2.5 hover:text-indigo-400 transition-colors bg-slate-900 border border-slate-800 px-6 py-3 rounded-full hover:border-indigo-500/30"
                    >
                        <Icon name="Cloud" weight="bold" /> Remnawave Panel
                    </button>
                </div>
            </div>
        </div>
    );
};
