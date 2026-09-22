// ============================================================
// Reading a duration the config may spell several ways
// ============================================================

export type TimeUnit = 'ms' | 's' | 'm' | 'h';

export const TO_SECONDS: Record<TimeUnit, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
};

/**
 * Splits `"30s"`, `"1.5h"` or a bare `30` into an amount and a unit.
 *
 * Xray writes some durations as a suffixed string and others as a plain
 * number in a field's own base unit, so the caller supplies the unit to
 * assume when none is written. Anything unparseable is handed back whole for
 * the field to show as typed rather than being silently rounded to zero.
 */
export function parseDuration(
    raw: string | number | undefined | null,
    fallbackUnit: TimeUnit = 's',
): { amount: string; unit: TimeUnit } {
    if (raw === undefined || raw === null || raw === '') {
        return { amount: '', unit: fallbackUnit };
    }
    const str = String(raw).trim();
    const match = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i);
    if (match) {
        const numStr = match[1]!;
        const unitStr = (match[2]?.toLowerCase() as TimeUnit) || fallbackUnit;
        return { amount: numStr, unit: unitStr };
    }
    return { amount: str, unit: fallbackUnit };
}
