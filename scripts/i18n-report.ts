/**
 * Reports the state of the translations: which strings the app renders without
 * a Russian entry, and which entries no longer match anything in the source.
 *
 * `bun test` enforces both as assertions; this prints them grouped by file so
 * they are actually fixable. Run with `bun run i18n:report`.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ru } from '../src/i18n/ru';
import { UNTRANSLATED } from '../src/i18n/untranslated';

const sourceFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
        else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) out.push(full);
    }
    return out;
};

const isI18n = (file: string) => /[\\/]i18n[\\/]/.test(file);

/** file → keys first seen in it, in source order. */
const used = new Map<string, string[]>();
const seen = new Set<string>();

for (const file of sourceFiles('src')) {
    if (isI18n(file)) continue;
    const text = readFileSync(file, 'utf8');
    const keys: string[] = [];
    for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        keys.push(JSON.parse(`"${m[1]}"`));
    }
    // tn(count, one, many) — the dictionary key is the two forms joined by "|".
    for (const m of text.matchAll(/\btn\([^,]+,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g)) {
        keys.push(`${JSON.parse(`"${m[1]}"`)}|${JSON.parse(`"${m[2]}"`)}`);
    }
    for (const key of keys) {
        if (seen.has(key)) continue;
        seen.add(key);
        if (!used.has(file)) used.set(file, []);
        used.get(file)!.push(key);
    }
}

const missing = new Map<string, string[]>();
let missingCount = 0;
for (const [file, keys] of used) {
    const gaps = keys.filter(key => !(key in ru) && !UNTRANSLATED.has(key));
    if (gaps.length) {
        missing.set(file, gaps);
        missingCount += gaps.length;
    }
}

for (const [file, keys] of [...missing].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n### ${file}  (${keys.length})`);
    for (const key of keys) console.log(`  ${key}`);
}

const stale = Object.keys(ru).filter(key => !seen.has(key));
const unusedExemptions = [...UNTRANSLATED].filter(key => !seen.has(key));
if (stale.length) {
    console.log(`\n### stale entries in ru.ts  (${stale.length})`);
    for (const key of stale) console.log(`  ${key}`);
}

if (unusedExemptions.length) {
    console.log(`\n### untranslated.ts entries nothing renders  (${unusedExemptions.length})`);
    for (const key of unusedExemptions) console.log(`  ${key}`);
}

const exempt = [...seen].filter(key => !(key in ru) && UNTRANSLATED.has(key)).length;
console.log(
    `\n${seen.size} keys rendered · ${seen.size - missingCount - exempt} translated · ` +
    `${exempt} same in both languages · ${missingCount} missing · ` +
    `${stale.length} stale · ${unusedExemptions.length} unused exemptions`,
);
