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

/** The default bypass set: Russian services plus the leak checkers. */
export const DEFAULT_BYPASS_DOMAINS: string[] = [
    ...RUSSIAN_DOMAINS,
    ...LEAK_CHECK_DOMAINS,
];
