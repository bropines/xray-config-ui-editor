import React from 'react';
import { Icon } from '../ui';
import { CONFIG_FILE_ACCEPT } from '../../core/config-file';
import type { Preset } from '../../core/presets';
import { t } from '../../i18n';

interface WelcomeScreenProps {
    presets: Preset[];
    onSelectPreset: (config: any) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenRemnawave: () => void;
    onOpenBuilder?: () => void;
}

const sourceButton =
    'text-xs md:text-sm text-slate-400 cursor-pointer flex items-center justify-center gap-2 '
    + 'bg-slate-900 border border-slate-800 px-4 h-11 rounded-full transition-colors';

/**
 * Landing screen shown when no config is loaded.
 *
 * On a phone this was the desktop layout at 412px: six full-height cards to
 * scroll past, a row of import buttons that ran off both edges, and the whole
 * thing centred inside its own scroller — which clips the top of anything
 * taller than the viewport rather than letting you scroll to it. Below `md`
 * a preset is a row, the sources wrap, and the column starts at the top.
 */
export const WelcomeScreen = ({
    presets,
    onSelectPreset,
    onFileUpload,
    onOpenRemnawave,
    onOpenBuilder,
}: WelcomeScreenProps) => (
    <div className="flex-1 flex flex-col items-center justify-start md:justify-center overflow-y-auto custom-scroll pb-28 md:pb-8">
        <div className="text-center mb-6 md:mb-10 pt-4 md:pt-0 px-4">
            <h1 className="text-2xl md:text-4xl text-white font-bold mb-2 md:mb-3 tracking-tight">
                {t("Welcome to Xray GUI")}
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto">
                {t("Drop your config.json anywhere, or choose a template to start.")}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full max-w-4xl px-4">
            {presets.map((preset, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelectPreset(preset.config)}
                    className="text-left bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 md:p-6 cursor-pointer transition-all group shadow-lg hover:shadow-indigo-500/10 flex flex-row md:flex-col items-center md:items-stretch gap-3"
                >
                    <div className="bg-slate-950 w-11 h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors shrink-0">
                        <Icon name={preset.icon} className="text-xl md:text-2xl" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-200 group-hover:text-white mb-0.5 md:mb-1 text-sm md:text-base">
                            {preset.name}
                        </h3>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed line-clamp-2 md:line-clamp-none">
                            {preset.description}
                        </p>
                    </div>
                </button>
            ))}
        </div>

        <div className="mt-8 md:mt-12 flex flex-col items-center gap-3 md:gap-4 w-full px-4 md:opacity-70 md:hover:opacity-100 transition-opacity">
            <div className="text-xs md:text-sm text-slate-500">{t("Or import from sources:")}</div>
            {/* Wrapping, not scrolling off both edges: three buttons do not fit
                a phone in one row and there was nothing to say they continued. */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-4 w-full max-w-md">
                <label className={`${sourceButton} hover:text-indigo-400`}>
                    <Icon name="FolderOpen" /> {t("Local File")}
                    <input type="file" className="hidden" accept={CONFIG_FILE_ACCEPT} onChange={onFileUpload} />
                </label>
                <button
                    type="button"
                    onClick={onOpenRemnawave}
                    className={`${sourceButton} hover:text-indigo-400`}
                >
                    <Icon name="Cloud" />
                    {t("Remnawave Panel")}
                </button>
                {onOpenBuilder && (
                    <button
                        type="button"
                        onClick={onOpenBuilder}
                        className={`${sourceButton} hover:text-emerald-400`}
                        title={t("Build a client config with a local balancer from a set of nodes")}
                    >
                        <Icon name="Scales" />
                        {t("Local Balancer")}
                    </button>
                )}
            </div>
        </div>
    </div>
);
