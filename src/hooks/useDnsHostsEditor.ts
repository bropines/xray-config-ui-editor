import { useState } from 'react';
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

    // What this editor last wrote, so the same object coming back through the
    // store is not mistaken for someone else's change. It has to be a value
    // and not a ref: the check below runs during render, where refs may not
    // be read — and a written set differs from the rows on screen whenever a
    // row is still half-typed, which is exactly what must not be wiped.
    const [writtenJson, setWrittenJson] = useState<string | null>(null);

    // Adopt a hosts object that changed elsewhere — a profile switch, an undo,
    // a JSON edit. Done during render rather than in an effect, so the old
    // list is never shown for a frame.
    const [seenHosts, setSeenHosts] = useState(hosts);
    if (hosts !== seenHosts) {
        setSeenHosts(hosts);
        if (writtenJson !== null && JSON.stringify(hosts) === writtenJson) {
            setWrittenJson(null);
        } else {
            const incomingEntries = Object.entries(hosts);
            const currentValidCount = entries.filter(e => e.domain.trim() !== "").length;
            if (incomingEntries.length !== currentValidCount) {
                setEntries(incomingEntries.map(([domain, ips]) => ({
                    domain,
                    ips: Array.isArray(ips) ? [...ips] : [ips],
                })));
            }
        }
    }

    const saveToStore = (currentEntries: DnsHostEntry[]) => {
        const result: Record<string, any> = {};

        currentEntries.forEach(e => {
            const domain = e.domain.trim();
            if (!domain || !isValidDomain(domain)) return;

            const validIps = e.ips.map(ip => ip.trim()).filter(ip => ip !== "" && isValidHostDestination(ip));
            if (validIps.length === 0) return;

            result[domain] = validIps.length === 1 ? validIps[0] : validIps;
        });

        setWrittenJson(JSON.stringify(result));
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
