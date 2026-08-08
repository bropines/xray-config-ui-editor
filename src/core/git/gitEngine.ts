import { diffLines, type Change } from 'diff';
import type { XrayConfig } from '../types';

export interface GitCommit {
    hash: string;             // e.g. "a1b2c3d"
    parentHash: string | null;
    branch: string;           // e.g. "main"
    message: string;          // e.g. "Add VLESS outbound and Youtube routing"
    timestamp: number;
    author: string;
    config: XrayConfig;
    stats: {
        additions: number;
        deletions: number;
        summary: string;
    };
}

export function generateShortHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 7; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

export function calculateConfigStats(oldConfig: XrayConfig | null, newConfig: XrayConfig) {
    const oldStr = oldConfig ? JSON.stringify(oldConfig, null, 2) : '';
    const newStr = JSON.stringify(newConfig, null, 2);

    const changes = diffLines(oldStr, newStr);
    let additions = 0;
    let deletions = 0;

    changes.forEach((change: Change) => {
        if (change.added) additions += change.count || 1;
        if (change.removed) deletions += change.count || 1;
    });

    const inbounds = newConfig.inbounds?.length || 0;
    const outbounds = newConfig.outbounds?.length || 0;
    const rules = newConfig.routing?.rules?.length || 0;
    const summary = `${inbounds} inbounds, ${outbounds} outbounds, ${rules} rules (${additions > 0 ? `+${additions}` : ''}${deletions > 0 ? ` -${deletions}` : ''})`;

    return { additions, deletions, summary, changes };
}

export function computeJsonDiff(configA: any, configB: any): Change[] {
    const strA = configA ? JSON.stringify(configA, null, 2) : '';
    const strB = configB ? JSON.stringify(configB, null, 2) : '';
    return diffLines(strA, strB);
}
