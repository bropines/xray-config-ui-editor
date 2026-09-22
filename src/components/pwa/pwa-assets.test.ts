import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * The manifest can be perfect and the app still refuse to install.
 *
 * `.gitignore` carries a blanket `*.png` / `*.ico` rule, so the generated
 * icons were never committed: the manifest shipped pointing at files that
 * 404'd, and Chrome answered "this app cannot be installed" with nothing in
 * the console to explain it. Nothing in a build or a type check notices —
 * only fetching the deployed files does.
 */
const config = readFileSync('vite.config.ts', 'utf8');

const manifestIcons = (): string[] => {
    const block = config.slice(config.indexOf('icons: ['), config.indexOf('],', config.indexOf('icons: [')));
    return [...block.matchAll(/src:\s*'([^']+)'/g)].map(match => match[1]!);
};

const headIcons = (): string[] => {
    const html = readFileSync('index.html', 'utf8');
    return [...html.matchAll(/<link[^>]+rel="(?:apple-touch-)?icon"[^>]+href="\.\/([^"]+)"/g)]
        .map(match => match[1]!);
};

const isIgnoredByGit = (path: string): boolean => {
    const result = Bun.spawnSync(['git', 'check-ignore', '-q', path]);
    return result.exitCode === 0;
};

describe('pwa assets', () => {
    it('every icon the manifest names exists', () => {
        const missing = manifestIcons().filter(icon => !existsSync(join('public', icon)));
        expect(missing).toEqual([]);
    });

    it('every icon the page links exists', () => {
        const missing = headIcons().filter(icon => !existsSync(join('public', icon)));
        expect(missing).toEqual([]);
    });

    it('none of them are ignored by git', () => {
        // The failure this test exists for: present locally, absent from the
        // deploy, manifest pointing at 404s.
        const ignored = [...manifestIcons(), ...headIcons()]
            .map(icon => join('public', icon))
            .filter(isIgnoredByGit);
        expect(ignored).toEqual([]);
    });

    it('declares the sizes Chrome needs to offer an install', () => {
        // 192 and 512 with purpose "any" — a maskable-only icon set is not
        // enough, and neither is one that stops at 180.
        const icons = manifestIcons();
        expect(icons.some(icon => icon.includes('192'))).toBe(true);
        expect(icons.some(icon => icon.includes('512') && !icon.includes('maskable'))).toBe(true);
    });
});
