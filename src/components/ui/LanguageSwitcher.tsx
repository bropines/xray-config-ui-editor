import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LANGUAGES, setLang, useLang } from '../../i18n';
import { Icon } from './Icon';

/**
 * Language picker for the header.
 *
 * A dropdown rather than a segmented EN/RU pair: the pair only stays readable
 * for exactly two languages, and it spends header width on the option you are
 * not using. The menu goes through a portal with fixed coordinates so the
 * header's own horizontal scroll cannot clip it.
 */
export const LanguageSwitcher = ({ className = '' }: { className?: string }) => {
    const lang = useLang();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const active = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]!;

    useLayoutEffect(() => {
        if (!open) {
            setCoords(null);
            return;
        }
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node)) return;
            if (menuRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const close = () => setOpen(false);
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [open]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title="Interface language / Язык интерфейса"
                className={`flex items-center gap-1 h-9 px-2 rounded-lg border transition-colors shrink-0 ${
                    open
                        ? 'bg-slate-800 border-indigo-500/50 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
                } ${className}`}
            >
                <Icon name="Translate" className="text-sm shrink-0" />
                <span className="text-[11px] font-bold">{active.short}</span>
                <Icon
                    name="CaretDown"
                    weight="bold"
                    className={`text-[9px] text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && coords && createPortal(
                <div
                    ref={menuRef}
                    role="listbox"
                    style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 99999 }}
                    className="min-w-[10rem] bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden
                        shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10
                        animate-in fade-in zoom-in-95 duration-150"
                >
                    {LANGUAGES.map(l => (
                        <button
                            key={l.code}
                            role="option"
                            aria-selected={l.code === lang}
                            onClick={() => {
                                setLang(l.code);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                                l.code === lang
                                    ? 'bg-indigo-600/20 text-indigo-200'
                                    : 'text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <span className="font-bold text-[10px] w-6 shrink-0 opacity-70">{l.short}</span>
                            <span className="flex-1">{l.label}</span>
                            {l.code === lang && <Icon name="Check" weight="bold" className="text-indigo-400 text-xs" />}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
};
