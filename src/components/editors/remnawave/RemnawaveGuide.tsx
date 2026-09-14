import { useCallback, useState } from 'react';
import { Icon } from '../../ui/Icon';
import { t } from '../../../i18n';

export type GuideModule = 'hosts' | 'templates' | 'snippets';

/**
 * The chain a subscriber's config travels down. Hosts, templates and snippets
 * are each one link in it, and the single most common confusion is not what a
 * host or a template does on its own but how the two meet — so every module
 * shows the same chain with its own link lit up.
 */
const deliveryChain = () => [
    t("Config profile"), t("Inbound"), t("Panel host"), t("XRAY JSON template"), t("Subscriber"),
];
const snippetChain = () => [t("Snippet"), t("Config profile"), t("Node")];

interface Guide {
    icon: string;
    accent: string;
    title: string;
    summary: string;
    chain: string[];
    /** Index into `chain` of the link this module is. */
    active: number;
    points: string[];
}

const guides = (): Record<GuideModule, Guide> => ({
    hosts: {
        icon: 'Broadcast',
        accent: 'cyan',
        title: t("What a host is"),
        summary: t("One entry in a subscription: the address a client connects to, and the inbound that serves it."),
        chain: deliveryChain(),
        active: 2,
        points: [
            t("Bind it to an inbound from a config profile — that is what fixes the protocol, the keys and the transport."),
            t("Attach an Xray JSON template and the subscriber receives that whole config instead of a single link. A balancer reaches people this way and no other."),
            t("A hidden host never appears in a subscription on its own. Hidden hosts are the pool a template injects."),
        ],
    },
    templates: {
        icon: 'FileText',
        accent: 'sky',
        title: t("What a subscription template is"),
        summary: t("The JSON a subscriber's client receives. The panel fills in the hosts; the template supplies everything around them — routing, balancer, DNS."),
        chain: deliveryChain(),
        active: 3,
        points: [
            t("A template carries no nodes of its own. It says which hosts to pull in, and the panel substitutes them when it renders the subscription."),
            t("Saving a template to the panel is not enough to publish it: attach it to a visible host, and that host's subscribers get it."),
            t("Form and JSON are two views of one object — switch between them as often as you like."),
        ],
    },
    snippets: {
        icon: 'BracketsCurly',
        accent: 'fuchsia',
        title: t("What a snippet is"),
        summary: t("A reusable array of routing rules or outbounds, stored once in the panel and shared by every config that references it."),
        chain: snippetChain(),
        active: 0,
        points: [
            t("A config refers to it by name, and the panel replaces that reference with the body before the config ever reaches a node."),
            t("Editing the body here changes every profile that references it — that is the whole point of a snippet."),
            t("Templates under “This browser” are local scratch copies. They never touch the panel."),
        ],
    },
});

const ACCENTS: Record<string, { border: string; bg: string; text: string; pill: string }> = {
    cyan: {
        border: 'border-cyan-500/30', bg: 'bg-cyan-950/20',
        text: 'text-cyan-300', pill: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
    },
    sky: {
        border: 'border-sky-500/30', bg: 'bg-sky-950/20',
        text: 'text-sky-300', pill: 'bg-sky-500/20 text-sky-200 border-sky-500/40',
    },
    fuchsia: {
        border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-950/20',
        text: 'text-fuchsia-300', pill: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40',
    },
};

const storageKey = (module: GuideModule) => `xray-ui-guide-${module}`;

/**
 * Collapsible explainer shown at the top of each Remnawave module.
 *
 * Open by default and remembered once dismissed: the people who need it are
 * reading it for the first time, and the people who don't have already closed
 * it. A tooltip could not carry the chain, which is the part that has to be
 * seen rather than read.
 */
export const RemnawaveGuide = ({ module }: { module: GuideModule }) => {
    const [open, setOpen] = useState(() => {
        try {
            return localStorage.getItem(storageKey(module)) !== 'closed';
        } catch {
            return true;
        }
    });

    const toggle = useCallback(() => {
        setOpen(prev => {
            try {
                localStorage.setItem(storageKey(module), prev ? 'closed' : 'open');
            } catch {
                // Not remembering it is survivable.
            }
            return !prev;
        });
    }, [module]);

    const guide = guides()[module];
    const accent = ACCENTS[guide.accent]!;

    return (
        <div className={`shrink-0 rounded-xl border ${accent.border} ${accent.bg} mb-3`}>
            <button
                onClick={toggle}
                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                aria-expanded={open}
            >
                <Icon name={guide.icon} weight="fill" className={`${accent.text} shrink-0`} />
                <span className={`text-xs font-bold ${accent.text}`}>{guide.title}</span>
                <span className="flex-1 min-w-0 text-[11px] text-slate-400 truncate hidden sm:block">
                    {!open && guide.summary}
                </span>
                <Icon
                    name={open ? 'CaretUp' : 'CaretDown'}
                    weight="bold"
                    className="text-slate-500 shrink-0 text-xs"
                />
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[11px] text-slate-300 leading-relaxed">{guide.summary}</p>

                    <div className="flex flex-wrap items-center gap-1">
                        {guide.chain.map((step, i) => (
                            <span key={step} className="flex items-center gap-1">
                                {i > 0 && <Icon name="CaretRight" className="text-slate-600 text-[9px]" />}
                                <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${
                                        i === guide.active
                                            ? accent.pill
                                            : 'bg-slate-900/60 border-slate-700/60 text-slate-400'
                                    }`}
                                >
                                    {step}
                                </span>
                            </span>
                        ))}
                    </div>

                    <ul className="space-y-1.5">
                        {guide.points.map(point => (
                            <li key={point} className="flex gap-2 text-[11px] text-slate-400 leading-relaxed">
                                <Icon name="Dot" weight="bold" className={`${accent.text} shrink-0 mt-0.5`} />
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
