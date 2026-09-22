import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `ModalBottomBar` portals a control out of the pane it was written in and
 * into the bar at the foot of the sheet. That is the point — but it also means
 * the control escapes whatever `hidden` its ancestors carried, so a button
 * that was invisible because its pane was closed becomes visible in the bar.
 *
 * And a control that is merely `hidden` does not make the bar go away: the bar
 * collapses on `:empty`, which a hidden child still defeats, leaving a strip
 * of border and padding around nothing.
 *
 * So the rule is: decide *whether* to render, do not render-and-hide. A `md:`
 * prefixed hidden is fine — the bar only exists below `md`.
 */

const SRC = join(import.meta.dir, '..', '..');

const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (entry.endsWith('.tsx')) out.push(full);
    }
    return out;
};

/** Every `<ModalBottomBar …>…</ModalBottomBar>` body, with its file. */
const usages = (): { file: string; body: string }[] => {
    const found: { file: string; body: string }[] = [];
    for (const file of walk(SRC)) {
        const source = readFileSync(file, 'utf8');
        if (!source.includes('<ModalBottomBar')) continue;
        const re = /<ModalBottomBar[^>]*>([\s\S]*?)<\/ModalBottomBar>/g;
        for (const match of source.matchAll(re)) {
            found.push({ file: file.slice(SRC.length + 1), body: match[1] ?? '' });
        }
    }
    return found;
};

describe('ModalBottomBar', () => {
    it('is used somewhere, or this test is guarding nothing', () => {
        expect(usages().length).toBeGreaterThan(0);
    });

    it('never holds a control hidden by a plain class', () => {
        // `hidden` not preceded by a breakpoint prefix.
        const bare = /(?<![\w:-])hidden(?![\w-])/;
        for (const { file, body } of usages()) {
            for (const className of body.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
                const value = className[1] ?? className[2] ?? '';
                expect(`${file}: ${value}`).not.toMatch(bare);
            }
        }
    });
});
