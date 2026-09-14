import React from 'react';
import { Icon } from '../../ui/Icon';
import { getSnippetRefName } from '../../../core/snippets';
import { t, tn } from '../../../i18n';

export const BalancerList = ({ balancers, activeIndex, onSelect, onDelete, snippets = [] }: any) => {
    const bodyFor = (name: string) => {
        const def = (snippets as any[]).find((d: any) => d?.name === name);
        return Array.isArray(def?.snippet) ? def.snippet : null;
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
            {balancers.map((b: any, i: number) => {
                const isActive = b.originalIndex !== undefined ? b.originalIndex === activeIndex : activeIndex === i;

                // Remnawave profiles reference snippets from routing.balancers
                // too. Such an entry has no tag, selector or strategy of its
                // own, so the normal row would render blank and flag an empty
                // selector. See core/snippets.
                const snippetName = getSnippetRefName(b);
                if (snippetName) {
                    const body = bodyFor(snippetName);
                    return (
                        <div key={i} onClick={() => onSelect(i)}
                            className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all mb-1
                ${isActive ? 'bg-fuchsia-600/20 border-fuchsia-500/60' : 'bg-fuchsia-950/20 border-fuchsia-500/25 hover:border-fuchsia-500/50'}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <Icon name="BracketsCurly" weight="bold" className="text-fuchsia-400 text-sm" />
                                    <div className="font-bold text-fuchsia-100 truncate">{snippetName}</div>
                                </div>
                                <div className="text-[10px] mt-0.5 font-mono">
                                    {body
                                        ? <span className="text-fuchsia-300/70">
                                            {t("snippet")} &middot; {tn(body.length, "{n} balancer", "{n} balancers")}
                                        </span>
                                        : <span className="text-amber-400/80">{t("snippet · body not loaded")}</span>}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                                className="md:opacity-0 md:group-hover:opacity-100 p-2 shrink-0 hover:bg-rose-900/50 rounded-md text-slate-500 hover:text-rose-400 transition-all"
                                title={t("Remove this snippet reference")}
                            >
                                <Icon name="Trash" className="text-base" />
                            </button>
                        </div>
                    );
                }

                return (
                    <div key={i} onClick={() => onSelect(i)}
                        className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all mb-1
            ${isActive ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-slate-900 border-transparent'}`}>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{b.tag}</div>
                                {/* ИКОНКА ОШИБКИ */}
                                {(!b.selector || b.selector.length === 0) && (
                                    <Icon name="Warning" className="text-rose-500 animate-bounce" weight="fill" title={t("Empty selector!")} />
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                {t("Strategy:")} {b.strategy?.type || 'random'}
                            </div>
                        </div>
                        {/* Кнопка удаления */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                            className="md:opacity-0 md:group-hover:opacity-100 p-2 shrink-0 hover:bg-rose-900/50 rounded-md text-slate-500 hover:text-rose-400 transition-all"
                        >
                            <Icon name="Trash" className="text-base" />
                        </button>
                    </div>
                );
            })}
            {balancers.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                    {t("No balancers found")}
                    </div>
            )}
        </div>
    );
};