import React from 'react';
import { Card } from '../ui/Card';
import { Button, ButtonGroup } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface InboundsColumnProps {
    inbounds: any[];
    openSectionJson: (section: string, title: string) => void;
    setModal: (modal: any) => void;
    deleteItem: (section: string, index: number) => void;
}

export const InboundsColumn = ({
    inbounds = [],
    openSectionJson,
    setModal,
    deleteItem
}: InboundsColumnProps) => {
    return (
        <Card 
            variant="column"
            title={`Inbounds (${inbounds.length})`} 
            icon="ArrowCircleDown" 
            iconColor="bg-emerald-600" 
            className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink" 
            actions={
                <ButtonGroup>
                    <Button variant="ghost" size="sm" onClick={() => openSectionJson("inbounds", "Inbounds")} icon="Code" title="View JSON" />
                    <Button variant="ghost" size="sm" onClick={() => setModal({ type: 'inbound', data: null, index: null })} icon="Plus" />
                </ButtonGroup>
            }
        >
            {inbounds.map((ib: any, i: number) => (
                <div key={i} className="card-item group flex justify-between items-start">
                    <div className="min-w-0 pr-2">
                        <div className="font-bold text-emerald-400 text-sm flex items-center gap-2 truncate">
                            <Icon name="Hash" weight="bold" /> 
                            {ib.tag || "no-tag"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono pl-6 truncate opacity-80 group-hover:opacity-100 transition-opacity">
                            <span className="text-emerald-600/80 font-bold">{ib.protocol}</span>
                            <span className="mx-1.5 text-slate-700">•</span>
                            <span>{ib.port || "dynamic"}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform md:translate-x-2 md:group-hover:translate-x-0">
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => setModal({ type: 'inbound', data: ib, index: i })} 
                            icon="PencilSimple" 
                            className="hover:bg-indigo-500/10 hover:text-indigo-400"
                        />
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => { if(confirm('Delete inbound?')) deleteItem('inbounds', i); }} 
                            icon="Trash" 
                            className="hover:bg-rose-500/10 hover:text-rose-500"
                        />
                    </div>
                </div>
            ))}
            {inbounds.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3 grayscale">
                    <Icon name="ArrowCircleDown" size={48} weight="thin" />
                    <p className="text-xs font-bold uppercase tracking-widest">No Inbounds</p>
                </div>
            )}
        </Card>
    );
};
