import { t } from '../../i18n';

// ============================================================
// Bypass domain presets — src/core/presets/bypass-domains.ts
// ============================================================
//
// Domain lists for the "route these straight out, do not proxy them" rule of a
// client config. Two separate buckets, because they answer different questions:
//
//   RUSSIAN_DOMAINS   — sites that only work (or work better) from a Russian
//                       IP: banks, government portals, marketplaces, media.
//   LEAK_CHECK_DOMAINS — IP/DNS-leak checkers. Sending these through the proxy
//                       is what makes them report the exit node instead of the
//                       real connection, which is usually the opposite of what
//                       someone testing their setup wants to see.
//
// Both are plain Xray matcher strings, ready for `routing.rules[].domain` and
// for a DNS server's `domains` list.
// ============================================================

/** Russian TLDs and services, matched before anything is proxied. */
export const RUSSIAN_DOMAINS: string[] = [
    "regexp:.+\\.ru$",
    "regexp:.+\\.su$",
    "regexp:.+\\.рф$",
    "domain:yandex.ru",
    "domain:yandex.net",
    "domain:ya.ru",
    "domain:mail.ru",
    "domain:vk.com",
    "domain:vk.me",
    "domain:ok.ru",
    "domain:sberbank.ru",
    "domain:tinkoff.ru",
    "domain:tbank.ru",
    "domain:gosuslugi.ru",
    "domain:mos.ru",
    "domain:wildberries.ru",
    "domain:ozon.ru",
    "domain:avito.ru",
    "domain:kinopoisk.ru",
    "domain:ivi.ru",
    "domain:2gis.ru",
    "domain:dzen.ru",
    "domain:rutube.ru",
    "domain:rt.ru",
    "domain:mts.ru",
    "domain:megafon.ru",
    "domain:beeline.ru",
    "domain:tele2.ru",
    "domain:nalog.gov.ru",
    "domain:cbr.ru",
];

/** IP and DNS leak checkers — keep them on the direct connection. */
export const LEAK_CHECK_DOMAINS: string[] = [
    "domain:2ip.ru",
    "domain:whoer.net",
    "domain:browserleaks.com",
    "domain:browserleaks.org",
    "domain:ipapi.is",
    "domain:iplocate.io",
    "domain:ifconfig.me",
    "domain:checkip.amazonaws.com",
    "domain:ipify.org",
    "domain:ip.sb",
    "domain:icanhazip.com",
    "domain:ifconfig.co",
    "domain:ident.me",
    "domain:myip.com",
    "domain:myip.is",
    "domain:ipinfo.io",
    "domain:ipecho.net",
    "domain:ip-api.com",
    "domain:ipwho.is",
    "domain:sypexgeo.net",
    "domain:ipapi.co",
    "domain:ipapi.com",
    "domain:db-ip.com",
    "domain:freeipapi.com",
    "domain:iplocation.net",
    "domain:ipchicken.com",
    "domain:iplocation.io",
    "domain:ipregistry.co",
    "domain:maxmind.com",
    "domain:geoiptool.com",
    "domain:ipgeolocation.io",
    "domain:ipdata.co",
    "domain:ipstack.com",
    "domain:ipqualityscore.com",
    "domain:scamalytics.com",
    "domain:iphey.com",
    "domain:pixelscan.net",
    "domain:dnsleaktest.com",
    "domain:ipleak.net",
    "domain:browserling.com",
    "domain:amiunique.org",
    "domain:deviceinfo.me",
    "domain:coveryourtracks.eff.org",
];

/**
 * One bypass list as the UI shows it. The registry below is what the builder
 * renders switches from, so adding a list here is the whole change — no new
 * toggle, no new state field, no second place to keep in sync.
 */
export interface BypassList {
    id: string;
    label: string;
    /** Why someone would keep these off the tunnel. */
    description: string;
    domains: string[];
}

export const BYPASS_LISTS: BypassList[] = [
    {
        id: 'russian',
        get label() { return t("Russian sites direct"); },
        get description() { return t("Banks, government portals, marketplaces and media that only work from a Russian address."); },
        domains: RUSSIAN_DOMAINS,
    },
    {
        id: 'leak-checks',
        get label() { return t("IP/DNS leak checkers direct"); },
        get description() { return t("Sites like whoer.net and ipleak.net. Proxied, they report the exit node instead of your real connection."); },
        domains: LEAK_CHECK_DOMAINS,
    },
];

/** The default bypass set: every list above, in registry order. */
export const DEFAULT_BYPASS_DOMAINS: string[] = BYPASS_LISTS.flatMap(list => list.domains);

/**
 * Split a bypass list back into "which presets are fully present" plus
 * whatever else it contained. Loading someone's existing config must not
 * quietly drop domains this app does not recognise.
 */
export const splitBypassDomains = (domains: string[]): { enabled: string[]; custom: string[] } => {
    const present = new Set(domains || []);
    const enabled = BYPASS_LISTS
        .filter(list => list.domains.length > 0 && list.domains.every(d => present.has(d)))
        .map(list => list.id);
    const covered = new Set(
        BYPASS_LISTS.filter(list => enabled.includes(list.id)).flatMap(list => list.domains)
    );
    return { enabled, custom: (domains || []).filter(d => !covered.has(d)) };
};

/** Rebuild a bypass list from the enabled preset ids plus custom entries. */
export const composeBypassDomains = (enabledIds: string[], custom: string[] = []): string[] => [
    ...BYPASS_LISTS.filter(list => enabledIds.includes(list.id)).flatMap(list => list.domains),
    ...custom,
];
