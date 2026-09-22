import React from "react";
import { Button, Icon } from "../../ui";
import { summariseDns, type DnsIssueCode } from "../../../core/dns/dns-summary";
import { DashCard } from "./DashCard";
import { t, tn } from "../../../i18n";

const dnsIssueText = (code: DnsIssueCode): string => ({
  'no-servers': t("No upstream servers — this DNS block resolves nothing."),
  'dns-outbound-unrouted': t("A dns outbound exists, but no routing rule sends queries to it, so the DNS block is not in the path."),
  'fakedns-unsniffed': t("FakeDNS pools are configured, but no inbound sniffs for fakedns — the pools are never used."),
  'ipv6-strategy-ipv4-upstreams': t("Query strategy is UseIPv6 while every upstream is reached over IPv4."),
})[code];

/**
 * What the DNS block actually does, rather than how many servers it lists.
 *
 * The summary is derived here rather than passed in: nothing else on the
 * dashboard needs it, and it is a pure function of the config.
 */
export const DnsCard = ({
    config,
    onEditDns,
    onOpenDnsJson,
}: {
    config: any;
    onEditDns: () => void;
    onOpenDnsJson: () => void;
}) => {
    const dns = React.useMemo(() => summariseDns(config), [config]);

    return (
    <DashCard
      title="DNS"
      icon="Globe"
      color="bg-indigo-600"
      className="shrink-0 w-full"
      actions={
        <div className="flex items-center bg-slate-950/50 p-1 rounded-xl border border-slate-700/50 gap-1 h-11">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDnsJson}
            icon="Code"
            iconClassName="text-sm"
            title={t("View JSON")}
            className="h-9 w-9 p-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditDns}
            icon="PencilSimple"
            iconClassName="text-sm"
            title={t("Edit DNS")}
            className="h-9 w-9 p-0"
          />
        </div>
      }
    >
      {dns.configured ? (
        <div className="flex flex-col gap-3">
          {/* The upstreams themselves, not a count of them. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {dns.servers.length === 0 ? (
              <span className="text-[11px] text-rose-300 italic">{t("no upstream servers")}</span>
            ) : (
              <>
                {dns.servers.slice(0, 4).map((server, i) => (
                  <span
                    key={`${server}-${i}`}
                    className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700/60 font-mono text-[11px] text-slate-200 max-w-[220px] truncate"
                    title={server}
                  >
                    {server}
                  </span>
                ))}
                {dns.servers.length > 4 && (
                  <span className="text-[11px] text-slate-500">
                    {t("+{n} more", { n: dns.servers.length - 4 })}
                  </span>
                )}
              </>
            )}
          </div>

          {/* The facts that change how resolution behaves. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
            <span className="text-slate-400">
              {t("Strategy:")}{' '}
              <span className="text-indigo-300 font-bold font-mono">{dns.strategy}</span>
            </span>

            {dns.scopedServers > 0 && (
              <span
                className="text-slate-400"
                title={t("A server restricted to a domain list only answers for those domains — that is what makes DNS split.")}
              >
                {tn(dns.scopedServers, "{n} scoped to domains", "{n} scoped to domains")}
              </span>
            )}

            {dns.hosts > 0 && (
              <span className="text-slate-400">
                {tn(dns.hosts, "{n} static host", "{n} static hosts")}
              </span>
            )}

            {dns.fakeDns.enabled && (
              <span className={`px-1.5 py-0.5 rounded border font-bold ${
                dns.fakeDns.sniffed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {tn(dns.fakeDns.pools, "FakeDNS · {n} pool", "FakeDNS · {n} pools")}
              </span>
            )}

            {dns.routedToDnsOutbound && (
              <span
                className="px-1.5 py-0.5 rounded border font-bold bg-sky-500/10 text-sky-300 border-sky-500/30"
                title={t("A routing rule sends queries to the dns outbound, so the DNS block is actually in the path.")}
              >
                {t("routed")}
              </span>
            )}

            {dns.clientIp && (
              <span className="text-slate-400">
                {t("ECS:")} <span className="font-mono text-slate-300">{dns.clientIp}</span>
              </span>
            )}
          </div>

          {/* Things that look configured but do nothing. */}
          {dns.issues.length > 0 && (
            <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
              {dns.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-[11px] ${
                    issue.severity === 'error' ? 'text-rose-300' : 'text-amber-300/90'
                  }`}
                >
                  <Icon
                    name={issue.severity === 'error' ? 'WarningOctagon' : 'Warning'}
                    weight="fill"
                    className="shrink-0 mt-0.5 text-[11px]"
                  />
                  <span>{dnsIssueText(issue.code)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 text-xs">
          {t("DNS not configured. Click Edit to initialize defaults.")}
          </div>
      )}
    </DashCard>
    );
};
