import React from 'react';
import { Card } from '../ui/Card';
import { Button, ButtonGroup } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface OutboundsColumnProps {
    outbounds: any[];
    filteredOutbounds: any[];
    obSearch: string;
    setObSearch: (search: string) => void;
    openSectionJson: (section: string, title: string) => void;
    setModal: (modal: any) => void;
    deleteItem: (section: string, index: number) => void;
    setBatchModalOpen: (open: boolean) => void;
}

export const OutboundsColumn = ({
    outbounds = [],
    filteredOutbounds = [],
    obSearch,
    setObSearch,
    openSectionJson,
    setModal,
    deleteItem,
    setBatchModalOpen
}: OutboundsColumnProps) => {
    return (
        <Card 
            variant="column"
            title={`Outbounds (${outbounds.length})`} 
            icon="ArrowCircleUp" 
            iconColor="bg-blue-600" 
            className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink" 
            actions={
                <div className="flex gap-2 items-center">
                    <div className="relative hidden md:block group/search">
                        <Icon name="MagnifyingGlass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] transition-colors group-focus-within/search:text-indigo-400" weight="bold" />
                        <input 
                            className="bg-slate-950 border border-slate-700/50 rounded-xl pl-9 pr-3 py-1.5 text-[10px] w-32 outline-none focus:w-48 focus:border-indigo-500/50 transition-all text-slate-100 placeholder:text-slate-600 shadow-inner" 
                            placeholder="Quick search..." 
                            value={obSearch} 
                            onChange={e => setObSearch(e.target.value)} 
                        />
                    </div>
                    <ButtonGroup>
                        <Button variant="ghost" size="sm" onClick={() => setBatchModalOpen(true)} icon="Stack" title="Batch Import/Export" />
                        <Button variant="ghost" size="sm" onClick={() => openSectionJson("outbounds", "Outbounds")} icon="Code" title="View JSON" />
                        <Button variant="ghost" size="sm" onClick={() => setModal({ type: 'outbound', data: null, index: null })} icon="Plus" title="Add Outbound" />
                    </ButtonGroup>
                </div>
            }
        >
            <div className="md:hidden mb-4 relative shrink-0">
                <Icon name="MagnifyingGlass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                    className="input-base pl-10 text-xs py-2.5 bg-slate-950/50 rounded-2xl border-slate-800" 
                    placeholder="Search outbounds..." 
                    value={obSearch} 
                    onChange={e => setObSearch(e.target.value)} 
                />
            </div>

            <div className="space-y-2.5">
                {filteredOutbounds.length > 0 ? filteredOutbounds.map((ob: any) => (
                    <div key={ob.i} className="card-item group flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                            <div className="font-bold text-blue-400 text-sm flex items-center gap-2 truncate">
                                <Icon name="PaperPlaneRight" weight="fill" />
                                {ob.tag || "no-tag"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono pl-6 truncate opacity-80 group-hover:opacity-100 transition-opacity">
                                <span className="text-blue-600/80 font-black uppercase tracking-tighter">{ob.protocol}</span>
                                {ob.protocol !== 'freedom' && ob.protocol !== 'blackhole' && (
                                    <>
                                        <span className="mx-1.5 text-slate-700">•</span>
                                        <span className="opacity-80">
                                            {ob.settings?.vnext?.[0]?.address || ob.settings?.servers?.[0]?.address || ob.settings?.address || "no-address"}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-x-2 md:group-hover:translate-x-0">
                            <Button 
                                variant="ghost" 
                                size="xs" 
                                onClick={() => setModal({ type: 'outbound', data: ob, index: ob.i })} 
                                icon="PencilSimple" 
                                className="hover:bg-indigo-500/10 hover:text-indigo-400"
                            />
                            <Button 
                                variant="ghost" 
                                size="xs" 
                                onClick={() => { if(confirm('Delete outbound?')) deleteItem('outbounds', ob.i); }} 
                                icon="Trash" 
                                className="hover:bg-rose-500/10 hover:text-rose-500"
                            />
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-3 grayscale">
                        <Icon name="MagnifyingGlass" size={48} weight="thin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center">
                            {obSearch ? 'No matches found' : 'No Outbounds'}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
};
