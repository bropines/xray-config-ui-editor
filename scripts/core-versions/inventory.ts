/**
 * Mechanical inventory of infra/conf per tag: every struct, its json keys and
 * Go types, plus the protocol registries, transport names and removed-feature
 * calls. Writes one JSON per tag and a key-level diff between neighbours.
 *
 *   bun run struct-inventory.ts <repoDir> <outDir>
 */
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const [repo, out] = process.argv.slice(2);
if (!repo || !out) throw new Error('usage: struct-inventory.ts <repoDir> <outDir>');
mkdirSync(out, { recursive: true });

const TAGS = ['v26.3.27', 'v26.7.28', 'v26.9.9', 'v26.9.30', 'v26.10.10'];

const git = (args: string) => execSync(`git ${args}`, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

type Fields = Record<string, string>;

const parseStructs = (content: string, file: string, into: Record<string, { file: string; fields: Fields }>) => {
    const structRegex = /type\s+(\w+)\s+struct\s*\{([\s\S]*?)\n\}/g;
    let m: RegExpExecArray | null;
    while ((m = structRegex.exec(content)) !== null) {
        const name = m[1]!;
        const body = m[2]!;
        const fields: Fields = {};
        for (const line of body.split('\n')) {
            const fm = /^\s*(\w+)\s+([^\s`]+)\s*(?:`([^`]*)`)?/.exec(line);
            if (!fm) continue;
            const tagMatch = fm[3] ? /json:"([^"]*)"/.exec(fm[3]) : null;
            const jsonKey = tagMatch ? tagMatch[1]!.split(',')[0]! : null;
            if (jsonKey === '-') continue;
            // Untagged exported fields still decode under their Go name.
            fields[jsonKey || fm[1]!] = fm[2]!;
        }
        into[name] = { file, fields };
    }
};

const registry = (xrayGo: string, loader: string): string[] => {
    const start = xrayGo.indexOf(`${loader} = NewJSONConfigLoader`);
    if (start < 0) return [];
    const end = xrayGo.indexOf('}, "protocol"', start);
    return [...xrayGo.slice(start, end).matchAll(/"([a-z0-9-]+)":/g)].map(match => match[1]!);
};

const inventories: Record<string, any> = {};

for (const tag of TAGS) {
    const files = git(`ls-tree --name-only ${tag} infra/conf/`)
        .split('\n').filter(f => f.endsWith('.go') && !f.endsWith('_test.go'));
    const structs: Record<string, { file: string; fields: Fields }> = {};
    const removed: { file: string; line: number; text: string }[] = [];
    const deprecated: { file: string; line: number; text: string }[] = [];
    let transportNames: string[] = [];

    for (const file of files) {
        const content = git(`show ${tag}:${file}`);
        parseStructs(content, file.replace('infra/conf/', ''), structs);
        content.split('\n').forEach((line, i) => {
            if (line.includes('PrintRemovedFeatureError')) removed.push({ file, line: i + 1, text: line.trim() });
            if (line.includes('PrintDeprecatedFeatureWarning') || line.includes('PrintNonRemovalDeprecatedFeatureWarning'))
                deprecated.push({ file, line: i + 1, text: line.trim() });
        });
        if (content.includes('func (p TransportProtocol) Build()')) {
            const start = content.indexOf('func (p TransportProtocol) Build()');
            const body = content.slice(start, content.indexOf('\n}\n', start));
            transportNames = [...body.matchAll(/case ([^:]+):/g)].flatMap(c => [...c[1]!.matchAll(/"([^"]+)"/g)].map(x => x[1]!));
        }
    }

    const xrayGo = git(`show ${tag}:infra/conf/xray.go`);
    inventories[tag] = {
        tag,
        inboundProtocols: registry(xrayGo, 'inboundConfigLoader'),
        outboundProtocols: registry(xrayGo, 'outboundConfigLoader'),
        transportNames,
        removedFeatureCalls: removed,
        deprecationCalls: deprecated,
        structs,
    };
    writeFileSync(join(out, `${tag}.json`), JSON.stringify(inventories[tag], null, 2));
}

// Key-level diff between neighbouring tags.
const lines: string[] = [];
for (let i = 1; i < TAGS.length; i++) {
    const a = inventories[TAGS[i - 1]!];
    const b = inventories[TAGS[i]!];
    lines.push(`################ ${a.tag} -> ${b.tag}`);
    const setDiff = (label: string, x: string[], y: string[]) => {
        const added = y.filter(v => !x.includes(v));
        const gone = x.filter(v => !y.includes(v));
        if (added.length || gone.length) lines.push(`${label}: +[${added.join(', ')}] -[${gone.join(', ')}]`);
    };
    setDiff('inbound protocols', a.inboundProtocols, b.inboundProtocols);
    setDiff('outbound protocols', a.outboundProtocols, b.outboundProtocols);
    setDiff('transport names', a.transportNames, b.transportNames);
    setDiff('removed-feature calls', a.removedFeatureCalls.map((r: any) => r.text), b.removedFeatureCalls.map((r: any) => r.text));
    setDiff('deprecation calls', a.deprecationCalls.map((r: any) => r.text), b.deprecationCalls.map((r: any) => r.text));

    const names = [...new Set([...Object.keys(a.structs), ...Object.keys(b.structs)])].sort();
    for (const name of names) {
        const sa = a.structs[name];
        const sb = b.structs[name];
        if (!sa) { lines.push(`+ struct ${name} (${sb.file}): ${Object.keys(sb.fields).join(', ')}`); continue; }
        if (!sb) { lines.push(`- struct ${name} (${sa.file}): ${Object.keys(sa.fields).join(', ')}`); continue; }
        const ka = Object.keys(sa.fields);
        const kb = Object.keys(sb.fields);
        const added = kb.filter(k => !ka.includes(k));
        const gone = ka.filter(k => !kb.includes(k));
        const retyped = kb.filter(k => ka.includes(k) && sa.fields[k] !== sb.fields[k])
            .map(k => `${k}: ${sa.fields[k]} -> ${sb.fields[k]}`);
        if (added.length || gone.length || retyped.length) {
            lines.push(`~ struct ${name} (${sb.file})` +
                (added.length ? `  +[${added.join(', ')}]` : '') +
                (gone.length ? `  -[${gone.join(', ')}]` : '') +
                (retyped.length ? `  retyped{${retyped.join('; ')}}` : ''));
        }
    }
    lines.push('');
}
writeFileSync(join(out, 'struct-diff.txt'), lines.join('\n'));
console.log(lines.join('\n'));
