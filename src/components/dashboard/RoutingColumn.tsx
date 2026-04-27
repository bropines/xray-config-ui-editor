import React from 'react';
import { Card } from '../ui/Card';
import { Button, ButtonGroup, cn } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface RoutingColumnProps {
    routing: any;
    openSectionJson: (section: string, title: string) => void;
    setModal: (modal: any) => void;
}

export const RoutingColumn = ({
    routing = {},
    openSectionJson,
    setModal
}: RoutingColumnProps) => {
    const rules = routing.rules || [];
    
    return (
        <Card 
            variant="column"
            title="Routing" 
            icon="ArrowsSplit" 
            iconColor="bg-purple-600" 
            className="h-[400px] xl:h-full xl:min-h-0 shrink-0 xl:shrink" 
            actions={
                <ButtonGroup>
                    <Button variant="ghost" size="sm" onClick={() => openSectionJson("routing", "Routing")} icon="Code" title="View JSON" />
                    <Button variant="ghost" size="sm" onClick={() => setModal({ type: 'routing', data: null, index: null })} icon="PencilSimple" title="Edit Routing" />
                </ButtonGroup>
            }
        >
            <div className="text-[10px] font-black uppercase tracking-tighter text-purple-300 bg-purple-900/30 p-2.5 rounded-xl mb-3 border border-purple-500/20 flex justify-between px-4 shrink-0 shadow-inner">
                <span className="opacity-70 uppercase tracking-widest">Strategy</span>
                <span className="text-white font-black">{routing.domainStrategy || "AsIs"}</span>
            </div>

            <div className="space-y-2.5">
                {rules.slice(0, 20).map((rule: any, i: number) => {
                    const hasName = !!rule.ruleTag;
                    const conditions: string[] = [];
                    if (rule.domain) conditions.push(`${rule.domain.length} dom`);
                    if (rule.ip) conditions.push(`${rule.ip.length} ip`);
                    if (rule.port) conditions.push('port');
                    if (rule.protocol) conditions.push('proto');
                    if (rule.inboundTag) conditions.push('inbound');
                    if (conditions.length === 0) conditions.push('any');
                    
                    const isBalancer = !!rule.balancerTag;
                    const target = rule.outboundTag || rule.balancerTag || "null";
                    
                    return (
                        <div key={i} className="text-[11px] bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 flex flex-col gap-2 group/rule shadow-sm">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                        isBalancer ? 'bg-purple-500 shadow-purple-500/40' : 'bg-blue-500 shadow-blue-500/40'
                                    )} />
                                    <span className={cn(
                                        "font-bold truncate tracking-tight",
                                        hasName ? 'text-slate-100' : 'text-slate-400 font-mono text-[10px]'
                                    )}>
                                        {rule.ruleTag || conditions.join(', ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 pl-2">
                                    <Icon name="ArrowRight" className="text-slate-600 text-[10px]" weight="bold" />
                                    <span className={cn(
                                        "font-mono font-black px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 max-w-[100px] truncate shadow-inner",
                                        isBalancer ? 'text-purple-400' : 'text-blue-400'
                                    )}>
                                        {target}
                                    </span>
                                </div>
                            </div>
                            {hasName && (
                                <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] pl-4.5 opacity-60 group-hover/rule:opacity-100 transition-opacity">
                                    {conditions.join(' • ')}
                                </div>
                            )}
                        </div>
                    );
                })}
                {rules.length === 0 && (
                    <div className="text-center text-slate-600 py-12 italic text-xs font-medium">
                        <Icon name="ArrowsSplit" size={32} className="mx-auto mb-3 opacity-20" />
                        No routing rules.<br />Traffic follows first outbound.
                    </div>
                )}
                {rules.length > 20 && (
                    <div className="text-center text-[10px] text-slate-500 font-black uppercase tracking-widest pt-4 border-t border-slate-800/50 mt-4 opacity-50">
                        +{(rules.length - 20)} more rules
                    </div>
                )}
            </div>
        </Card>
    );
};
