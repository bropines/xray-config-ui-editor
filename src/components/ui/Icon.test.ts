import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import * as PhosphorIcons from '@phosphor-icons/react';
import { hasIcon, iconBody, iconNames } from './icon-map.generated';
import { collectIconNames, renderIconMap } from '../../../scripts/generate-icon-map';

/**
 * `Icon` looks its component up by string, so a name that is not in the map
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

const literalIconNames = () => {
    const found: { file: string; name: string }[] = [];
    for (const file of sourceFiles('src')) {
        const text = readFileSync(file, 'utf8');
        const names = new Set<string>();
        // <Icon name="X" />, icon="X", saveIcon="X", and { icon: 'X' }
        for (const m of text.matchAll(/\b(?:name|icon|saveIcon)=["']([A-Za-z][A-Za-z0-9-]*)["']/g)) {
            names.add(m[1]!);
        }
        for (const m of text.matchAll(/\bicon:\s*['"]([A-Za-z][A-Za-z0-9-]*)['"]/g)) {
            names.add(m[1]!);
        }
        for (const name of names) {
            // `name=` is also a plain HTML attribute; only flag it where the
            // file actually renders icons.
            if (!text.includes('Icon') && !text.includes('icon')) continue;
            found.push({ file, name });
        }
    }
    return found;
};

describe('icon names', () => {
    it('every literal icon name exists in the icon set', () => {
        const broken = literalIconNames()
            .filter(({ name }) => !(toPascal(name) in PhosphorIcons))
            .map(({ file, name }) => `${file}: ${name}`);
        expect(broken).toEqual([]);
    });

    it('every literal icon name is in the generated map', () => {
        // The map is what ships. A name Phosphor has but the map does not is
        // still a red "?" in the browser.
        const missing = literalIconNames()
            .filter(({ name }) => !hasIcon(toPascal(name)))
            .map(({ file, name }) => `${file}: ${name}`);
        expect(missing).toEqual([]);
    });

    it('carries real markup for every weight the app asks for', () => {
        for (const weight of ['regular', 'bold', 'fill', 'duotone']) {
            const body = iconBody('Warning', weight);
            expect(body).toContain('<path');
        }
        // An unknown weight falls back rather than rendering an empty svg.
        expect(iconBody('Warning', 'nonsense')).toBe(iconBody('Warning', 'regular'));
        expect(iconBody('NotAnIconAtAll', 'regular')).toBeUndefined();
    });

    it('the checked-in map is what the generator would write', () => {
        // Otherwise an icon added today renders fine in dev, where the stale
        // map still happens to contain it, and breaks after the next
        // regeneration — or never gets regenerated at all.
        const current = readFileSync('src/components/ui/icon-map.generated.ts', 'utf8');
        expect(renderIconMap(collectIconNames())).toBe(current);
    });

    it('ships far fewer icons than the set contains', () => {
        // The point of the map. If this ever approaches the full set, the
        // scan has started matching ordinary strings.
        const total = Object.keys(PhosphorIcons).length;
        expect(iconNames().length).toBeLessThan(total / 4);
    });
});
