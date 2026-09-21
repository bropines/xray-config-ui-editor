import { describe, expect, it } from 'bun:test';
import { generateSpiderPath, mergeSpiderPaths, parseSpiderPaths } from './spider-path';

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

    it('draws from a supplied pool instead of inventing a path', () => {
        const pool = ['/ru/support', '/assets/app.js', '/api/v1/status'];
        for (const path of sample(120, { pool })) {
            expect(pool).toContain(path);
        }
        // A real path beats a plausible one, so the pool wins over the shape.
        for (const path of sample(60, { pool, shape: 'api' })) {
            expect(pool).toContain(path);
        }
    });

    it('still avoids the current value when drawing from a pool', () => {
        const pool = ['/a/one', '/b/two', '/c/three'];
        for (const path of sample(120, { pool, avoid: '/b/two' })) {
            expect(path).not.toBe('/b/two');
        }
    });

    it('ignores pool entries that are not paths', () => {
        for (const path of sample(60, { pool: ['not-a-path', '', 'https://x/y'] as string[] })) {
            expect(path.startsWith('/')).toBe(true);
        }
    });
});

describe('parseSpiderPaths', () => {
    it('reads a sitemap', () => {
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><changefreq>daily</changefreq></url>
  <url><loc>https://example.com/docs/getting-started</loc></url>
  <url><loc>https://example.com/blog/2026/04/release-notes</loc></url>
</urlset>`;
        expect(parseSpiderPaths(sitemap)).toEqual([
            '/', '/docs/getting-started', '/blog/2026/04/release-notes',
        ]);
    });

    it('reads a HAR export and leaves other people\'s servers out of it', () => {
        // Third-party paths exist on a third party. spiderX is walked on the
        // target, so keeping them would guarantee 404s.
        const har = `{"log":{"entries":[
  {"request":{"method":"GET","url":"https://example.com/"}},
  {"request":{"method":"GET","url":"https://example.com/static/js/app.9f1c.js"}},
  {"request":{"method":"GET","url":"https://example.com/img/hero.webp?v=3"}},
  {"request":{"method":"POST","url":"https://analytics.vendor.io/collect"}}
]}}`;
        expect(parseSpiderPaths(har)).toEqual(['/', '/static/js/app.9f1c.js', '/img/hero.webp']);
    });

    it('reads a page of HTML', () => {
        const html = `<link rel="stylesheet" href="/assets/css/main.min.css">
<script src="/assets/js/bundle.js" defer></script>
<a href="https://example.com/pricing">Pricing</a>
<a href="mailto:hi@example.com">Mail</a>`;
        expect(parseSpiderPaths(html)).toEqual([
            '/assets/css/main.min.css', '/assets/js/bundle.js', '/pricing',
        ]);
    });

    it('reads a list someone typed', () => {
        const list = `
# paths from the real site
/support
/support/faq/

/support
/downloads/report.pdf
`;
        // Trailing slashes and repeats collapse; the comment is a comment.
        expect(parseSpiderPaths(list)).toEqual(['/support', '/support/faq', '/downloads/report.pdf']);
    });

    it('drops the query and fragment', () => {
        // They are not decoration in spiderX: the core reads its own spider
        // tuning out of the query.
        expect(parseSpiderPaths('/search?q=weather&page=2\n/docs#install'))
            .toEqual(['/search', '/docs']);
    });

    it('keeps out what is not a path', () => {
        const junk = `just some prose
javascript:void(0)
mailto:someone@example.com
data:image/png;base64,iVBORw0KGgo=
C:\\Users\\bropi\\config.json
/a b/c`;
        expect(parseSpiderPaths(junk)).toEqual([]);
    });

    it('percent-encodes a non-ASCII path once', () => {
        const encoded = parseSpiderPaths('/новости')[0]!;
        expect(encoded).toBe(encodeURI('/новости'));
        // Feeding the result back in must not encode the encoding.
        expect(parseSpiderPaths(encoded)).toEqual([encoded]);
    });

    it('honours a limit and returns nothing for nothing', () => {
        const many = Array.from({ length: 50 }, (_, i) => `/page/${i}`).join('\n');
        expect(parseSpiderPaths(many, { limit: 10 })).toHaveLength(10);
        expect(parseSpiderPaths('')).toEqual([]);
        expect(parseSpiderPaths('nothing usable here')).toEqual([]);
    });
});

describe('mergeSpiderPaths', () => {
    it('extends the stored list instead of replacing it', () => {
        expect(mergeSpiderPaths(['/a', '/b'], ['/b', '/c'])).toEqual(['/a', '/b', '/c']);
    });

    it('stops at the limit', () => {
        expect(mergeSpiderPaths(['/a'], ['/b', '/c'], 2)).toEqual(['/a', '/b']);
    });
});
