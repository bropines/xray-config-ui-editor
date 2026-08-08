import type { XrayConfig } from '../types';
import type { ValidationError } from '../validators';

export type DiagnosticSeverity = 'critical' | 'warning' | 'info';

export interface Diagnostic {
    section: string;
    itemIndex?: number;
    field?: string;
    message: string;
    severity: DiagnosticSeverity;
    suggestion?: string;
}

export const runFullDiagnostics = (config: XrayConfig | null): Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];

    if (!config) return diagnostics;

    const inbounds = config.inbounds || [];
    const outbounds = config.outbounds || [];
    const routing = config.routing || {};
    const rules = routing.rules || [];
    const balancers = routing.balancers || [];

    const allOutboundTags = new Set(outbounds.map((o: any) => o.tag).filter(Boolean));
    const allBalancerTags = new Set(balancers.map((b: any) => b.tag).filter(Boolean));

    // Tags that may exist in external systems (e.g. Remnawave)
    const KNOWN_EXTERNAL_TAGS = new Set(['TORRENT', 'DIRECT', 'REJECT', 'BLOCK', 'DNS']);
    const allTargetTags = new Set([...allOutboundTags, ...allBalancerTags, ...KNOWN_EXTERNAL_TAGS]);

    const checkOutbound = (o: any, i: number) => {
        const stream = o.streamSettings || {};
        const net = stream.network || 'tcp';
        const sec = stream.security || 'none';

        if (net === 'grpc') {
            const grpc = stream.grpcSettings || {};
            if (!grpc.serviceName) {
                diagnostics.push({
                    section: 'outbounds', itemIndex: i, field: 'grpcSettings',
                    severity: 'critical', message: 'gRPC requires "serviceName" to be set.',
                    suggestion: 'Add a service name (e.g., "GunService").',
                });
            }
        }

        if (sec === 'reality') {
            const r = stream.realitySettings || {};
            if (!r.publicKey) {
                diagnostics.push({
                    section: 'outbounds', itemIndex: i, field: 'realitySettings',
                    severity: 'critical', message: 'REALITY requires "publicKey" for outbounds.',
                });
            }
            if (!r.serverName) {
                diagnostics.push({
                    section: 'outbounds', itemIndex: i, field: 'realitySettings',
                    severity: 'warning', message: 'REALITY usually requires "serverName" (SNI) to match the destination.',
                });
            }
        }

        const flow = (o.settings?.vnext?.[0]?.users?.[0]?.flow) || (o.settings?.users?.[0]?.flow);
        const mux = o.mux || {};

        if (flow === 'xtls-rprx-vision' && mux.enabled) {
            diagnostics.push({
                section: 'outbounds', itemIndex: i, field: 'mux',
                severity: 'critical', message: 'XTLS-Vision is incompatible with Mux/XUDP.',
                suggestion: 'Disable Mux for this outbound to use Vision flow.',
            });
        }

        if (sec === 'reality' && mux.enabled) {
            diagnostics.push({
                section: 'outbounds', itemIndex: i, field: 'mux',
                severity: 'warning', message: 'Using Mux with REALITY is not recommended (affects fingerprint).',
                suggestion: 'Consider disabling Mux for Reality outbounds.',
            });
        }

        if (net === 'xhttp') {
            const x = stream.xhttpSettings || {};
            if (x.mode === 'stream-up' && sec === 'none') {
                diagnostics.push({
                    section: 'outbounds', itemIndex: i,
                    severity: 'critical', message: 'XHTTP "stream-up" mode MANDATORY requires TLS or REALITY.',
                    suggestion: 'Enable Security or change mode to "packet-up".',
                });
            }
        }
    };

    const checkInbound = (inb: any, i: number) => {
        const stream = inb.streamSettings || {};
        const sec = stream.security || 'none';

        if (sec === 'reality') {
            const r = stream.realitySettings || {};
            if (!r.dest || !r.privateKey) {
                diagnostics.push({
                    section: 'inbounds', itemIndex: i, field: 'realitySettings',
                    severity: 'critical', message: 'REALITY Inbound requires "dest" and "privateKey".',
                    suggestion: 'Configure a fallback destination and generate a private key.',
                });
            }
        }

        if (sec === 'tls') {
            const tls = stream.tlsSettings || {};
            if (!tls.certificates || tls.certificates.length === 0) {
                diagnostics.push({
                    section: 'inbounds', itemIndex: i, field: 'tlsSettings',
                    severity: 'critical', message: 'TLS Inbound requires at least one certificate.',
                });
            }
        }
    };

    inbounds.forEach(checkInbound);
    outbounds.forEach(checkOutbound);

    const seenDomains = new Map<string, { index: number; name: string }>();
    const seenIPs = new Map<string, { index: number; name: string }>();

    rules.forEach((rule: any, i: number) => {
        const ruleName = rule.ruleTag || rule.outboundTag || rule.balancerTag || `Rule #${i + 1}`;

        if (rule.outboundTag && !allTargetTags.has(rule.outboundTag)) {
            diagnostics.push({
                section: 'routing', itemIndex: i, field: 'outboundTag',
                severity: 'critical', message: `Rule targets unknown outbound: "${rule.outboundTag}"`,
            });
        }
        if (rule.balancerTag && !allTargetTags.has(rule.balancerTag)) {
            diagnostics.push({
                section: 'routing', itemIndex: i, field: 'balancerTag',
                severity: 'critical', message: `Rule targets unknown balancer: "${rule.balancerTag}"`,
            });
        }

        // Check duplicate domain / geosite matchers
        if (Array.isArray(rule.domain)) {
            rule.domain.forEach((d: string) => {
                if (!d || typeof d !== 'string') return;
                const key = d.trim().toLowerCase();
                if (seenDomains.has(key)) {
                    const first = seenDomains.get(key)!;
                    diagnostics.push({
                        section: 'routing',
                        itemIndex: i,
                        field: 'domain',
                        severity: 'warning',
                        message: `Duplicate matcher "${d}" in ${ruleName} — already matched in ${first.name} (Rule #${first.index + 1}). Traffic for "${d}" will be shadowed by Rule #${first.index + 1}.`,
                        suggestion: `Remove duplicate "${d}" or reorder routing rules.`
                    });
                } else {
                    seenDomains.set(key, { index: i, name: ruleName });
                }
            });
        }

        // Check duplicate IP / geoip matchers
        if (Array.isArray(rule.ip)) {
            rule.ip.forEach((ip: string) => {
                if (!ip || typeof ip !== 'string') return;
                const key = ip.trim().toLowerCase();
                if (seenIPs.has(key)) {
                    const first = seenIPs.get(key)!;
                    diagnostics.push({
                        section: 'routing',
                        itemIndex: i,
                        field: 'ip',
                        severity: 'warning',
                        message: `Duplicate IP matcher "${ip}" in ${ruleName} — already matched in ${first.name} (Rule #${first.index + 1}). Traffic for "${ip}" will be shadowed by Rule #${first.index + 1}.`,
                        suggestion: `Remove duplicate "${ip}" or reorder routing rules.`
                    });
                } else {
                    seenIPs.set(key, { index: i, name: ruleName });
                }
            });
        }
    });

    return diagnostics;
};
