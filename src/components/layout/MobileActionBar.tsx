import React from 'react';
import { Icon } from '../ui/Icon';
import { t } from '../../i18n';

interface MobileActionBarProps {
    hasConfig: boolean;
    onOpenModules: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownload: () => void;
    onOpenAbout: () => void;
}

/**
 * The verbs, at the bottom of the screen, where a thumb is.
 *
 * The top bar was six controls of equal weight, one of them carrying a text
 * label — so "push to cloud" took 40% of the width and everything else was
 * squeezed into what was left. These are not navigation; they are the things
 * you *do* on this screen, which is what a bottom bar is for. Cloud stayed
 * upstairs, next to the indicator that says whether you are linked to it.
 *
 * It hides when you scroll down and comes back when you scroll up. In a
 * browser tab the address bar is often along the same edge, and two bars
 * stacked there cost more than the bar is worth; installed, it simply stays.
 */
export const MobileActionBar = ({
    hasConfig,
    onOpenModules,
    onFileUpload,
    onDownload,
    onOpenAbout,
}: MobileActionBarProps) => {
    const [hidden, setHidden] = React.useState(false);

    React.useEffect(() => {
        // Capture phase, because the thing that scrolls is usually a pane
        // inside the page rather than the page. Positions are tracked per
        // element: comparing one scroller's offset against another's would
        // read every switch between them as a direction change.
        const lastOffset = new WeakMap<EventTarget, number>();
        const onScroll = (event: Event) => {
            const target = event.target;
            if (!target) return;
            const offset = target === document || target === document.documentElement
                ? window.scrollY
                : (target as HTMLElement).scrollTop;
            if (typeof offset !== 'number') return;
            const previous = lastOffset.get(target) ?? 0;
            lastOffset.set(target, offset);
            const delta = offset - previous;
            // Ignore the jitter of a momentum scroll settling.
            if (Math.abs(delta) < 12) return;
            setHidden(delta > 0 && offset > 48);
        };
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, []);

    const item = 'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors';

    return (
        <div
            // `transition-transform` in Tailwind 4 covers `translate` as well
            // as `transform` (measured: transition-property is "transform,
            // translate, scale, rotate"), so the translate utilities animate.
            className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 ${
                hidden ? 'translate-y-full' : 'translate-y-0'
            }`}
        >
            <div className="flex items-stretch gap-1">
                <button
                    type="button"
                    onClick={onOpenModules}
                    disabled={!hasConfig}
                    className={`${item} ${hasConfig ? 'text-indigo-300 active:bg-indigo-500/10' : 'text-slate-600'}`}
                >
                    <Icon name="SlidersHorizontal" className="text-lg" />
                    <span>{t("Modules")}</span>
                </button>

                <label className={`${item} text-slate-300 active:bg-slate-800 cursor-pointer`}>
                    <Icon name="FolderOpen" className="text-lg" />
                    <span>{t("Open")}</span>
                    <input type="file" className="hidden" accept=".json" onChange={onFileUpload} />
                </label>

                <button
                    type="button"
                    onClick={onDownload}
                    disabled={!hasConfig}
                    className={`${item} ${hasConfig ? 'text-emerald-300 active:bg-emerald-500/10' : 'text-slate-600'}`}
                >
                    <Icon name="DownloadSimple" className="text-lg" />
                    <span>{t("Save")}</span>
                </button>

                <button
                    type="button"
                    onClick={onOpenAbout}
                    className={`${item} text-slate-400 active:bg-slate-800`}
                >
                    <Icon name="Info" className="text-lg" />
                    <span>{t("About")}</span>
                </button>
            </div>
        </div>
    );
};
