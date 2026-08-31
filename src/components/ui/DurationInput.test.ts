import { describe, it, expect } from 'bun:test';
import { parseDuration } from './DurationInput';

describe('parseDuration helper', () => {
    it('parses empty or undefined values gracefully', () => {
        expect(parseDuration(undefined, 's')).toEqual({ amount: '', unit: 's' });
        expect(parseDuration(null, 'm')).toEqual({ amount: '', unit: 'm' });
        expect(parseDuration('', 'ms')).toEqual({ amount: '', unit: 'ms' });
    });

    it('parses duration strings with units', () => {
        expect(parseDuration('10s')).toEqual({ amount: '10', unit: 's' });
        expect(parseDuration('1m')).toEqual({ amount: '1', unit: 'm' });
        expect(parseDuration('500ms')).toEqual({ amount: '500', unit: 'ms' });
        expect(parseDuration('2h')).toEqual({ amount: '2', unit: 'h' });
    });

    it('parses duration strings with whitespace or case differences', () => {
        expect(parseDuration(' 15 S ')).toEqual({ amount: '15', unit: 's' });
        expect(parseDuration('2.5m')).toEqual({ amount: '2.5', unit: 'm' });
        expect(parseDuration('250MS')).toEqual({ amount: '250', unit: 'ms' });
    });

    it('handles numeric inputs using fallback unit', () => {
        expect(parseDuration(60, 's')).toEqual({ amount: '60', unit: 's' });
        expect(parseDuration(5, 'm')).toEqual({ amount: '5', unit: 'm' });
        expect(parseDuration('100', 'ms')).toEqual({ amount: '100', unit: 'ms' });
    });
});
