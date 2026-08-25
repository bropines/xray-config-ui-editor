import { useMemo } from 'react';
import { validateRule, lintRule } from '../core/validators';

/**
 * All the derived state and mutation logic for editing a single routing
 * rule: duplicate-matcher detection across the rule set, validation/lint,
 * autofix handlers, and the field-update function. Extracted out of
 * RuleEditor.tsx so that component is left as composition of
 * SmartTagInput/TagSelector/SchemaForm — rewriting its layout doesn't risk
 * touching this logic, and this logic is testable without rendering JSX.
 */
export function useRuleEditor(rule: any, onChange: (rule: any) => void, allRules: any[] = []) {
    // Calculate duplicate matchers across all rules (flagging all conflicting rules)
    const duplicateWarnings = useMemo(() => {
        if (!allRules || !rule) return [];
        const currentIdx = rule.originalIndex !== undefined ? rule.originalIndex : allRules.findIndex((r: any) => r === rule);
        if (currentIdx < 0) return [];

        const itemWarnings: Array<{ matcher: string; otherRuleName: string; otherIndex: number }> = [];
        const domainToRules = new Map<string, Array<{ index: number; name: string }>>();
        const ipToRules = new Map<string, Array<{ index: number; name: string }>>();

        allRules.forEach((r: any, i: number) => {
            const rName = r.ruleTag || r.outboundTag || r.balancerTag || `Rule #${i + 1}`;
            if (Array.isArray(r.domain)) {
                r.domain.forEach((d: string) => d && typeof d === 'string' && (domainToRules.has(d.trim().toLowerCase()) ? domainToRules.get(d.trim().toLowerCase())!.push({ index: i, name: rName }) : domainToRules.set(d.trim().toLowerCase(), [{ index: i, name: rName }])));
            }
            if (Array.isArray(r.ip)) {
                r.ip.forEach((ip: string) => ip && typeof ip === 'string' && (ipToRules.has(ip.trim().toLowerCase()) ? ipToRules.get(ip.trim().toLowerCase())!.push({ index: i, name: rName }) : ipToRules.set(ip.trim().toLowerCase(), [{ index: i, name: rName }])));
            }
        });

        if (Array.isArray(rule.domain)) {
            rule.domain.forEach((d: string) => {
                if (!d || typeof d !== 'string') return;
                const matches = domainToRules.get(d.trim().toLowerCase()) || [];
                matches.filter(m => m.index !== currentIdx).forEach(m => {
                    itemWarnings.push({ matcher: d, otherRuleName: m.name, otherIndex: m.index });
                });
            });
        }

        if (Array.isArray(rule.ip)) {
            rule.ip.forEach((ip: string) => {
                if (!ip || typeof ip !== 'string') return;
                const matches = ipToRules.get(ip.trim().toLowerCase()) || [];
                matches.filter(m => m.index !== currentIdx).forEach(m => {
                    itemWarnings.push({ matcher: ip, otherRuleName: m.name, otherIndex: m.index });
                });
            });
        }

        return itemWarnings;
    }, [rule, allRules]);

    const update = (field: string, val: any) => {
        const newRule = { ...rule };
        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
            delete newRule[field];
        } else {
            newRule[field] = val;
        }
        if (field === 'outboundTag') delete newRule.balancerTag;
        if (field === 'balancerTag') delete newRule.outboundTag;
        onChange(newRule);
    };

    const handleAutofixMatchers = () => onChange({ ...rule, network: "tcp,udp" });
    const handleAutofixCase = () => onChange({
        ...rule,
        ...(rule.domain ? { domain: rule.domain.map((d: string) => d.toLowerCase()) } : {}),
        ...(rule.ip ? { ip: rule.ip.map((ip: string) => ip.toLowerCase()) } : {}),
    });

    const errors = rule ? validateRule(rule) : [];
    const warnings = rule ? lintRule(rule) : [];

    const hasMissingMatchers = errors.some((e: any) => e.field === 'matchers');
    const missingTarget = errors.some((e: any) => e.field === 'target');

    const invalidDomains = errors
        .filter((e: any) => e.field.startsWith('domain_'))
        .map((e: any) => (rule?.domain || [])[parseInt(e.field.replace('domain_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const invalidIPs = errors
        .filter((e: any) => e.field.startsWith('ip_'))
        .map((e: any) => (rule?.ip || [])[parseInt(e.field.replace('ip_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const warnDomains = warnings
        .filter((e: any) => e.field.startsWith('domain_'))
        .map((e: any) => (rule?.domain || [])[parseInt(e.field.replace('domain_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const warnIPs = warnings
        .filter((e: any) => e.field.startsWith('ip_'))
        .map((e: any) => (rule?.ip || [])[parseInt(e.field.replace('ip_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const currentTarget = rule?.balancerTag ? `bal:${rule.balancerTag}` : (rule?.outboundTag || "");

    const errorRecord: Record<string, string> = {};
    errors.forEach((e: any) => {
        errorRecord[e.field] = e.message;
    });

    return {
        duplicateWarnings,
        update,
        handleAutofixMatchers,
        handleAutofixCase,
        errors,
        warnings,
        hasMissingMatchers,
        missingTarget,
        invalidDomains,
        invalidIPs,
        warnDomains,
        warnIPs,
        currentTarget,
        errorRecord,
    };
}
