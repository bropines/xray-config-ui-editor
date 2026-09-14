import { LANGUAGES, setLang, useLang } from '../../i18n';
import { Icon } from './Icon';

/**
 * EN / RU toggle. Two languages fit in a segmented control, which is one click
 * instead of the two a dropdown costs; if a third language ever lands this
 * should become a Select.
 */
export const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
    const lang = useLang();

    return (
        <div
            className={`flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg p-0.5 gap-0.5 ${className}`}
            title="Interface language / Язык интерфейса"
        >
            <Icon name="Translate" className="text-slate-500 text-xs ml-1 mr-0.5 shrink-0" />
            {LANGUAGES.map(l => (
                <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    aria-pressed={lang === l.code}
                    title={l.label}
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded-md transition-colors ${
                        lang === l.code
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    {l.short}
                </button>
            ))}
        </div>
    );
};
