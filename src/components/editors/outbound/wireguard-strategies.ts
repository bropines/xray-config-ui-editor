import { t } from '../../../i18n';

/**
 * What Xray-core accepts for a WireGuard outbound's `domainStrategy`.
 *
 * `infra/conf/wireguard.go` lower-cases the value and matches it against
 * exactly these five, with an empty value meaning ForceIP; anything else
 * returns "unsupported domain strategy" and the core does not start. The form
 * used to offer `AsIs` and `UseIP` — neither of which is in that switch — and
 * hid the four IPv4/IPv6 variants that are.
 *
 * Ordered for reading rather than as the schema declares them: the default
 * comes first. `wireguard-strategies.test.ts` keeps the set in step with
 * WireguardDomainStrategySchema, which the JSON linter validates against.
 */
export const WG_DOMAIN_STRATEGIES = (): { value: string; label: string; description: string }[] => [
    { value: 'ForceIP', label: t("ForceIP (Default)"), description: t("Resolve the endpoint to any address") },
    { value: 'ForceIPv4', label: t("ForceIPv4"), description: t("IPv4 only") },
    { value: 'ForceIPv6', label: t("ForceIPv6"), description: t("IPv6 only") },
    { value: 'ForceIPv4v6', label: t("ForceIPv4v6"), description: t("IPv4 first, then IPv6") },
    { value: 'ForceIPv6v4', label: t("ForceIPv6v4"), description: t("IPv6 first, then IPv4") },
];
