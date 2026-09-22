import { type Change } from 'diff';
import { boundedDiff, diffCounts } from './bounded-diff';
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

    // Counts only, on a short budget: this feeds a line in a dialog, and an
    // exact alignment of two 7,000-line configs can take sixteen seconds.
    const { additions, deletions, approximate } = diffCounts(oldStr, newStr);

    const inbounds = newConfig.inbounds?.length || 0;
    const outbounds = newConfig.outbounds?.length || 0;
    const rules = newConfig.routing?.rules?.length || 0;
    const approx = approximate ? '~' : '';
    const summary = `${inbounds} inbounds, ${outbounds} outbounds, ${rules} rules (${additions > 0 ? `${approx}+${additions}` : ''}${deletions > 0 ? ` ${approx}-${deletions}` : ''})`;

    return { additions, deletions, summary, approximate };
}

/**
 * The diff the user is looking at. Null when it could not be produced within
 * the budget — the caller is expected to say so rather than show nothing.
 */
export function computeJsonDiff(configA: any, configB: any): Change[] | null {
    const strA = configA ? JSON.stringify(configA, null, 2) : '';
    const strB = configB ? JSON.stringify(configB, null, 2) : '';
    return boundedDiff(strA, strB).changes;
}
