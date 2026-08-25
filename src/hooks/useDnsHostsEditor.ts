import { useEffect, useRef, useState } from 'react';
import { isValidDomain, isValidHostDestination } from '../core/validators';

/**
 * DnsHosts.tsx's `onChange` replaces the whole `dns.hosts` map (domain ->
 * ip | ip[]), not a single config path — and the editable UI shape (an
 * ordered list of {domain, ips} rows, including in-progress/invalid rows)
 * doesn't match the stored shape (a validated object keyed by domain), so
 * this doesn't fit the useField/useArrayField model. Instead, the derived
 * local list, the map<->list conversion, and the mutation handlers are
 * extracted here (RuleEditor-style) so DnsHosts.tsx is left as pure JSX
 * composition over what this hook returns.
 */
export interface DnsHostEntry {
    domain: string;
    ips: string[];
}

export function useDnsHostsEditor(hosts: Record<string, any> = {}, onChange: (result: Record<string, any>) => void) {
    const [entries, setEntries] = useState<DnsHostEntry[]>(() =>
        Object.entries(hosts).map(([domain, ips]) => ({
            domain,
            ips: Array.isArray(ips) ? [...ips] : [ips],
        }))
    );

    const isInternalChange = useRef(false);

    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        const incomingEntries = Object.entries(hosts);
        const currentValidCount = entries.filter(e => e.domain.trim() !== "").length;

        if (incomingEntries.length !== currentValidCount) {
            const newEntries = incomingEntries.map(([domain, ips]) => ({
                domain,
                ips: Array.isArray(ips) ? [...ips] : [ips],
            }));
            setEntries(newEntries);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hosts]);

    const saveToStore = (currentEntries: DnsHostEntry[]) => {
        const result: Record<string, any> = {};

        currentEntries.forEach(e => {
            const domain = e.domain.trim();
            if (!domain || !isValidDomain(domain)) return;

            const validIps = e.ips.map(ip => ip.trim()).filter(ip => ip !== "" && isValidHostDestination(ip));
            if (validIps.length === 0) return;

            result[domain] = validIps.length === 1 ? validIps[0] : validIps;
        });

        isInternalChange.current = true;
        onChange(result);
    };

    const addHost = () => {
        setEntries(prev => [...prev, { domain: "", ips: [""] }]);
    };

    const updateDomain = (hIdx: number, val: string) => {
        const newEntries = entries.map((item, i) =>
            i === hIdx ? { ...item, domain: val } : item
        );
        setEntries(newEntries);
        saveToStore(newEntries);
    };

    const updateIpValue = (hIdx: number, ipIdx: number, val: string) => {
        const newEntries = entries.map((item, i) => {
            if (i !== hIdx) return item;
            return {
                ...item,
                ips: item.ips.map((ip, j) => (j === ipIdx ? val : ip)),
            };
        });
        setEntries(newEntries);
        saveToStore(newEntries);
    };

    const removeHost = (hIdx: number) => {
        const newEntries = entries.filter((_, i) => i !== hIdx);
        setEntries(newEntries);
        saveToStore(newEntries);
    };

    return {
        entries,
        addHost,
        updateDomain,
        updateIpValue,
        removeHost,
    };
}
