import { describe, expect, it } from 'bun:test';
import { generateSpiderPath } from './spider-path';

const sample = (n: number, options?: Parameters<typeof generateSpiderPath>[0]) =>
    Array.from({ length: n }, () => generateSpiderPath(options));

describe('generateSpiderPath', () => {
    it('always produces a path xray-core will accept', () => {
        for (const path of sample(300)) {
            // The conf parser rejects a spiderX that does not start with "/".
            expect(path.startsWith('/')).toBe(true);
            expect(path).toBe(encodeURI(path));
            expect(new URL(path, 'https://example.com').pathname).toBe(path);
        }
    });

    it('never emits a query string or fragment', () => {
        // xray-core reads the spider's own tuning ranges out of spiderX's
        // query, so a decorative "?q=weather" would be quietly eaten and
        // reinterpreted as configuration.
        for (const path of sample(300)) {
            expect(path).not.toContain('?');
            expect(path).not.toContain('#');
        }
    });

    it('produces paths that read like a real request', () => {
        for (const path of sample(300)) {
            expect(path).not.toContain('//');
            expect(path).not.toMatch(/\s/);
            expect(path.endsWith('/')).toBe(false);
            // Every segment is a word or a filename, never a run of noise —
            // "/xzga" was the old generator's entire output.
            for (const segment of path.split('/').filter(Boolean)) {
                expect(segment).toMatch(/^[a-z0-9]+([-.][a-z0-9]+)*$/);
            }
        }
    });

    it('builds each shape as its name promises', () => {
        for (const path of sample(60, { shape: 'api' })) {
            expect(path).toMatch(/^\/api(\/v\d)?\/[a-z]/);
        }
        for (const path of sample(60, { shape: 'asset' })) {
            // An asset is a file, so it ends in an extension.
            expect(path).toMatch(/\.[a-z0-9]{2,5}$/);
        }
        for (const path of sample(60, { shape: 'page' })) {
            expect(path).not.toMatch(/\.[a-z0-9]{2,5}$/);
        }
    });

    it('does not hand back the value already in the field', () => {
        const current = generateSpiderPath();
        for (const path of sample(200, { avoid: current })) {
            expect(path).not.toBe(current);
        }
        // Whitespace around the current value should not defeat the check.
        expect(sample(100, { avoid: `  ${current}  ` })).not.toContain(current);
    });

    it('varies enough that clicking twice is worth doing', () => {
        expect(new Set(sample(200)).size).toBeGreaterThan(40);
    });
});
