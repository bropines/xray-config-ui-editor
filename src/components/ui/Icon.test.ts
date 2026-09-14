import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import * as PhosphorIcons from '@phosphor-icons/react';

/**
 * `Icon` looks its component up by string, so a name Phosphor does not export
 * renders a small red "?" instead of failing anywhere a compiler could see it.
 * Icon sets rename things between versions, which is exactly when this bites.
 */
const sourceFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
        else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) out.push(full);
    }
    return out;
};

/** Mirrors the kebab-case handling in `Icon`. */
const toPascal = (name: string) =>
    name.includes('-')
        ? name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
        : name.charAt(0).toUpperCase() + name.slice(1);

describe('icon names', () => {
    it('every literal icon name exists in the icon set', () => {
        const broken: string[] = [];
        for (const file of sourceFiles('src')) {
            const text = readFileSync(file, 'utf8');
            const names = new Set<string>();
            // <Icon name="X" />, icon="X", saveIcon="X", and { icon: 'X' }
            for (const m of text.matchAll(/\b(?:name|icon|saveIcon)=["']([A-Za-z][A-Za-z0-9-]*)["']/g)) {
                names.add(m[1]);
            }
            for (const m of text.matchAll(/\bicon:\s*['"]([A-Za-z][A-Za-z0-9-]*)['"]/g)) {
                names.add(m[1]);
            }
            for (const name of names) {
                // `name=` is also a plain HTML attribute; only flag it where the
                // file actually renders icons.
                if (!text.includes('Icon') && !text.includes('icon')) continue;
                if (!(toPascal(name) in PhosphorIcons)) broken.push(`${file}: ${name}`);
            }
        }
        expect(broken).toEqual([]);
    });
});
