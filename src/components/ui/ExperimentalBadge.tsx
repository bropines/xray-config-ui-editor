import React from 'react';
import { Badge } from './Badge';

export interface ExperimentalBadgeProps {
    /** Short human note on where this landed, e.g. "main since Aug 25, 2026". */
    since?: string;
    /** Xray-core commit SHA this field/feature was introduced in, if known. */
    commit?: string;
    className?: string;
}

/**
 * Marks a field/section that exists on Xray-core's main branch but hasn't
 * shipped in a tagged release yet (or is otherwise explicitly experimental
 * upstream). Part of the schema-sync pipeline: see scripts/generate-xray-schema.cjs
 * and the field comments in src/core/xray/schemas/** for the source commit.
 *
 * Usage: <FormField label={<>Remote DNS <ExperimentalBadge since="main, 25 Aug 2026" /></>} />
 */
export const ExperimentalBadge = ({ since, commit, className }: ExperimentalBadgeProps) => (
    <span title={commit ? `Landed in xray-core commit ${commit}, not yet in a tagged release.` : undefined}>
        <Badge variant="warning" size="sm" icon="Flask" className={className}>
            Experimental{since ? ` · ${since}` : ''}
        </Badge>
    </span>
);
