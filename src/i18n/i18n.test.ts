import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getLang, setLang, t, tn } from './index';
import { ru } from './ru';
import { UNTRANSLATED } from './untranslated';

const sourceFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...sourceFiles(full));
        } else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) {
            out.push(full);
        }
    }
    return out;
};

/** Every `t("…")` and `tn(n, "…", "…")` literal used anywhere in the app. */
const usedKeys = (): Map<string, string> => {
    const found = new Map<string, string>();
    for (const file of sourceFiles('src')) {
        if (/[\\/]i18n[\\/]/.test(file)) continue;
        const text = readFileSync(file, 'utf8');
        for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
            const key = JSON.parse(`"${m[1]}"`);
            if (!found.has(key)) found.set(key, file);
        }
        for (const m of text.matchAll(/\btn\([^,]+,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g)) {
            const key = `${JSON.parse(`"${m[1]}"`)}|${JSON.parse(`"${m[2]}"`)}`;
            if (!found.has(key)) found.set(key, file);
        }
    }
    return found;
};

describe('translation lookup', () => {
    it('falls back to the key when a language has no entry', () => {
        setLang('en');
        expect(t('Add Inbound')).toBe('Add Inbound');
        setLang('ru');
        expect(t('a string nobody has translated')).toBe('a string nobody has translated');
        setLang('en');
    });

    it('substitutes named variables', () => {
        setLang('en');
        expect(t('Saved {count} of {total}', { count: 2, total: 5 })).toBe('Saved 2 of 5');
        // A placeholder with no matching variable is left alone rather than
        // rendering "undefined" in the middle of a sentence.
        expect(t('Saved {count} of {total}', { count: 2 })).toBe('Saved 2 of {total}');
    });

    it('picks the English plural form by count', () => {
        setLang('en');
        expect(tn(1, '{n} config', '{n} configs')).toBe('1 config');
        expect(tn(3, '{n} config', '{n} configs')).toBe('3 configs');
        expect(tn(0, '{n} config', '{n} configs')).toBe('0 configs');
    });

    it('picks all three Russian plural forms', () => {
        setLang('ru');
        const forms = (n: number) => tn(n, '{n} config', '{n} configs');
        expect(forms(1)).toBe('1 конфиг');
        expect(forms(2)).toBe('2 конфига');
        expect(forms(5)).toBe('5 конфигов');
        expect(forms(11)).toBe('11 конфигов'); // not "1 конфиг"
        expect(forms(21)).toBe('21 конфиг');
        expect(forms(112)).toBe('112 конфигов'); // not "2 конфига"
        expect(forms(22)).toBe('22 конфига');
        setLang('en');
    });

    it('remembers the chosen language', () => {
        const store = new Map<string, string>();
        (globalThis as any).localStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
        };
        try {
            setLang('ru');
            expect(getLang()).toBe('ru');
            expect(store.get('xray-ui-lang')).toBe('ru');
        } finally {
            delete (globalThis as any).localStorage;
            setLang('en');
        }
    });

    it('still switches when storage is unavailable', () => {
        // No localStorage at all here (as in this test runner), and a browser in
        // private mode can throw from setItem — neither may break the switch.
        (globalThis as any).localStorage = {
            getItem: () => null,
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
        };
        try {
            setLang('ru');
            expect(getLang()).toBe('ru');
        } finally {
            delete (globalThis as any).localStorage;
            setLang('en');
        }
    });
});

describe('russian coverage', () => {
    it('translates every string the app renders', () => {
        const missing = [...usedKeys().keys()]
            .filter(key => !(key in ru) && !UNTRANSLATED.has(key))
            .sort();
        // Printed rather than summarised: the list is the actionable part when
        // someone adds a string and forgets the translation.
        expect(missing).toEqual([]);
    });

    it('has no entries for strings the app no longer uses', () => {
        const used = usedKeys();
        const stale = Object.keys(ru).filter(key => !used.has(key)).sort();
        expect(stale).toEqual([]);
    });

    it('keeps every placeholder that the English side declares', () => {
        const used = usedKeys();
        const broken: string[] = [];
        for (const [key, value] of Object.entries(ru)) {
            if (!used.has(key)) continue;
            const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
            // Plural keys hold pipe-separated forms; each form repeats the vars.
            const englishVars = vars(key.split('|')[0]);
            for (const form of value.split('|')) {
                if (vars(form) !== englishVars) broken.push(`${key} → ${form}`);
            }
        }
        expect(broken).toEqual([]);
    });
});
