import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Help } from '../../ui/Help';
import { useConfigStore } from '../../../store/configStore';
import { parseSpiderPaths, mergeSpiderPaths } from '../../../core/generators';
import { toast } from 'sonner';
import { t, tn } from '../../../i18n';

/** How many of the stored paths to show before collapsing into a count. */
const PREVIEW_LIMIT = 14;

/**
 * A list of paths the REALITY target really serves.
 *
 * The generator can only produce paths that *look* real; the target's own
 * paths are the ones that will not 404, and they are always a paste away —
 * a sitemap, a HAR export, the page's HTML, or a list typed by hand. When
 * this list has anything in it, the spiderX dice draws from it instead.
 */
export const SpiderPathsEditor = () => {
    const spiderPaths = useConfigStore(state => state.spiderPaths);
    const setSpiderPaths = useConfigStore(state => state.setSpiderPaths);
    const [draft, setDraft] = useState('');

    const handleParse = () => {
        const found = parseSpiderPaths(draft);
        if (found.length === 0) {
            toast.error(t("No paths found in that text."));
            return;
        }
        const merged = mergeSpiderPaths(spiderPaths, found);
        const added = merged.length - spiderPaths.length;
        setSpiderPaths(merged);
        setDraft('');
        if (added === 0) {
            toast.info(t("Every path in there is already on the list."));
            return;
        }
        toast.success(tn(added, "Added {n} path", "Added {n} paths"));
    };

    const handleRemove = (path: string) => {
        setSpiderPaths(spiderPaths.filter(stored => stored !== path));
    };

    const shown = spiderPaths.slice(0, PREVIEW_LIMIT);

    return (
        <Card
            title={t("SpiderX Paths")}
            icon="Path"
            headerExtra={spiderPaths.length > 0 ? (
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-emerald-300 font-bold">
                        {tn(spiderPaths.length, "{n} path · the dice uses it", "{n} paths · the dice uses them")}
                    </span>
                    <Button variant="ghost" size="sm" icon="Trash" onClick={() => setSpiderPaths([])}>
                        {t("Clear")}
                    </Button>
                </div>
            ) : undefined}
        >
            <div className="text-[11px] text-slate-400 leading-relaxed">
                {t("spiderX is walked on the target site itself, so a path that site really serves is the only kind that does not 404. Paste a sitemap, a HAR export, the page's HTML, or just a list of paths — whatever is in there gets read.")}
                <Help>{t("Absolute URLs from other hosts are dropped: their paths live on someone else's server. Query strings are dropped too — xray-core reads the spider's own tuning out of spiderX's query, so they are not decoration.")}</Help>
            </div>

            <textarea
                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-[11px] font-mono text-white focus:border-indigo-500 outline-none resize-y leading-relaxed custom-scroll"
                placeholder={"https://example.com/docs/getting-started\n/assets/js/app.min.js\n<loc>https://example.com/pricing</loc>"}
                value={draft}
                onChange={e => setDraft(e.target.value)}
            />

            <div className="flex items-center gap-3">
                <Button variant="secondary" icon="TextAlignLeft" onClick={handleParse} disabled={!draft.trim()}>
                    {t("Read paths")}
                </Button>
                <span className="text-[11px] text-slate-500">
                    {spiderPaths.length === 0
                        ? t("Until there is a list here, the dice builds a plausible-looking path instead.")
                        : t("New paths are appended; the ones already stored are kept.")}
                </span>
            </div>

            {spiderPaths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800">
                    {shown.map(path => (
                        <span
                            key={path}
                            className="group flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-slate-900 border border-slate-700/60 font-mono text-[11px] text-slate-200 max-w-[260px]"
                            title={path}
                        >
                            <span className="truncate">{path}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(path)}
                                title={t("Remove")}
                                className="text-slate-600 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                            >
                                <Icon name="X" weight="bold" className="text-[10px]" />
                            </button>
                        </span>
                    ))}
                    {spiderPaths.length > PREVIEW_LIMIT && (
                        <span className="text-[11px] text-slate-500 self-center">
                            {t("+{n} more", { n: spiderPaths.length - PREVIEW_LIMIT })}
                        </span>
                    )}
                </div>
            )}
        </Card>
    );
};
