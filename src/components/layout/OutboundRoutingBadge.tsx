import { Icon } from '../ui/Icon';
import type { OutboundRoutingSummary, RoutingLayer } from '../../core/routing/outbound-routing';
import { t, tn } from '../../i18n';

const LAYER_STYLE: Record<Exclude<RoutingLayer, 'none'>, string> = {
    L4: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    L7: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    mixed: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
};

const layerTitle = (layer: RoutingLayer): string => {
    switch (layer) {
        case 'L4':
            return t("Transport-layer routing: matches on addresses and ports, which are always available.");
        case 'L7':
            return t("Application-layer routing: matches on domains or protocols, which only exist once the inbound has sniffed the traffic. Without sniffing these rules never match.");
        case 'mixed':
            return t("Both layers: some rules match on addresses and ports, others need the traffic sniffed first.");
        default:
            return '';
    }
};

/**
 * How traffic reaches one outbound, shown on its card.
 *
 * Two things are worth seeing at a glance and neither was visible before: that
 * an outbound is reached through a balancer rather than by name, and that the
 * rules reaching it decide at the application layer — because those depend on
 * sniffing being on, and silently match nothing when it is not.
 */
export const OutboundRoutingBadge = ({ summary }: { summary?: OutboundRoutingSummary }) => {
    if (!summary) return null;

    const { routes, layer, balancers, unreachable, isDefault } = summary;
    const viaBalancer = routes.some(route => route.via);

    return (
        <div className="flex flex-wrap items-center gap-1 mt-1">
            {unreachable && (
                <span
                    title={t("No routing rule sends traffic here, and it is not the first outbound, so nothing reaches it.")}
                    className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-rose-500/10 text-rose-300 border-rose-500/30"
                >
                    {t("unreachable")}
                </span>
            )}

            {isDefault && (
                <span
                    title={t("The first outbound: Xray sends it everything no rule matched.")}
                    className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                >
                    {t("default")}
                </span>
            )}

            {layer !== 'none' && (
                <span
                    title={layerTitle(layer)}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${LAYER_STYLE[layer]}`}
                >
                    {layer === 'mixed' ? t("L4+L7") : layer}
                </span>
            )}

            {routes.length > 0 && (
                <span
                    title={routes
                        .map(route => `${route.label}${route.via ? ` → ${route.via}` : ''}`
                            + (route.matchers.length ? ` (${route.matchers.join(', ')})` : ''))
                        .join('\n')}
                    className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-slate-800/60 text-slate-400 border-slate-700/60"
                >
                    {tn(routes.length, "{n} rule", "{n} rules")}
                </span>
            )}

            {viaBalancer && balancers.length > 0 && (
                <span
                    title={t("Reached through a balancer rather than by name — the rule points at the balancer, which selects this outbound by tag prefix.")}
                    className="px-1.5 py-0.5 rounded border text-[9px] font-bold bg-purple-500/10 text-purple-300 border-purple-500/30 inline-flex items-center gap-1 max-w-[140px]"
                >
                    <Icon name="Scales" className="text-[9px] shrink-0" />
                    <span className="truncate">{balancers.join(', ')}</span>
                </span>
            )}
        </div>
    );
};
