#!/usr/bin/env node
/**
 * xray-schema-diff.cjs — discovery step of the schema-sync pipeline.
 *
 * Compares the Go structs actually defined in XTLS/Xray-core's infra/conf
 * (the package whose JSON tags define the wire config format) against a
 * local lock file snapshot, and reports what changed: new structs (usually
 * a new protocol/transport), new/removed fields on existing structs, and
 * type changes. It does NOT touch the hand-authored Zod schemas in
 * src/core/xray/schemas/** — this is read-only discovery. A human decides
 * what to actually patch into the Zod schemas based on the report.
 *
 * Usage:
 *   node scripts/xray-schema-diff.cjs            # report only
 *   node scripts/xray-schema-diff.cjs --write-lock  # report, then update the lock file
 *
 * The lock file (scripts/.xray-schema-lock.json) is intentionally tiny and
 * diffable: { syncedAt, headCommit, structs: { StructName: { jsonKey: goType } } }.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_API_URL = 'https://api.github.com/repos/XTLS/Xray-core/contents/infra/conf';
const COMMITS_API_URL = 'https://api.github.com/repos/XTLS/Xray-core/commits?path=infra/conf&per_page=1';
const LOCK_PATH = path.join(__dirname, '.xray-schema-lock.json');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'xray-ui-schema-sync' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'xray-ui-schema-sync' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Minimal struct/field extraction — only what's needed to detect drift
// (name + Go type per field). Kept independent from generate-xray-schema.cjs
// on purpose: this script must keep working for discovery even if the
// generator's output shape changes.
function parseStructs(content) {
    const structs = {};
    const structRegex = /type\s+(\w+)\s+struct\s*\{([\s\S]*?)\}/g;
    let m;
    while ((m = structRegex.exec(content)) !== null) {
        const structName = m[1];
        const structBody = m[2];
        const fieldRegex = /^[ \t]*(\w+)\s+([\w*[\].{}]+)(?:\s+`json:"([^"]+)"`)?/gm;
        let fm;
        const fields = {};
        while ((fm = fieldRegex.exec(structBody)) !== null) {
            const jsonTag = fm[3] ? fm[3].split(',')[0] : fm[1];
            if (jsonTag === '-') continue;
            fields[jsonTag] = fm[2].trim();
        }
        structs[structName] = fields;
    }
    return structs;
}

async function fetchCurrentStructs() {
    const files = await fetchJson(REPO_API_URL);
    if (!Array.isArray(files)) {
        throw new Error('Could not list infra/conf from GitHub: ' + JSON.stringify(files));
    }
    const goFiles = files.filter((f) => f.name.endsWith('.go') && !f.name.endsWith('_test.go'));

    const structs = {};
    for (const fileInfo of goFiles) {
        const content = await fetchText(fileInfo.download_url);
        Object.assign(structs, parseStructs(content));
    }
    return structs;
}

function loadLock() {
    if (!fs.existsSync(LOCK_PATH)) return null;
    try {
        return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    } catch {
        return null;
    }
}

function diff(oldStructs, newStructs) {
    const report = { newStructs: [], removedStructs: [], changedStructs: [] };
    const oldNames = new Set(Object.keys(oldStructs));
    const newNames = new Set(Object.keys(newStructs));

    for (const name of newNames) {
        if (!oldNames.has(name)) report.newStructs.push(name);
    }
    for (const name of oldNames) {
        if (!newNames.has(name)) report.removedStructs.push(name);
    }

    for (const name of newNames) {
        if (!oldNames.has(name)) continue; // already reported as new
        const oldFields = oldStructs[name];
        const newFields = newStructs[name];
        const addedFields = [];
        const removedFields = [];
        const changedFields = [];

        for (const key of Object.keys(newFields)) {
            if (!(key in oldFields)) addedFields.push({ key, type: newFields[key] });
            else if (oldFields[key] !== newFields[key]) {
                changedFields.push({ key, from: oldFields[key], to: newFields[key] });
            }
        }
        for (const key of Object.keys(oldFields)) {
            if (!(key in newFields)) removedFields.push(key);
        }

        if (addedFields.length || removedFields.length || changedFields.length) {
            report.changedStructs.push({ name, addedFields, removedFields, changedFields });
        }
    }
    return report;
}

function printReport(report, isFirstRun) {
    if (isFirstRun) {
        console.log('No lock file found — this is the first run. Writing a baseline snapshot.');
        console.log('Run again after the next Xray-core update to see a real diff.\n');
        return;
    }

    const totalChanges = report.newStructs.length + report.removedStructs.length + report.changedStructs.length;
    if (totalChanges === 0) {
        console.log('No drift detected — infra/conf structs match the lock file.');
        return;
    }

    console.log(`=== Xray-core infra/conf drift since last sync ===\n`);

    if (report.newStructs.length) {
        console.log(`New structs (likely a new protocol/transport/feature) [${report.newStructs.length}]:`);
        report.newStructs.forEach((n) => console.log(`  + ${n}`));
        console.log('');
    }
    if (report.removedStructs.length) {
        console.log(`Removed structs [${report.removedStructs.length}]:`);
        report.removedStructs.forEach((n) => console.log(`  - ${n}`));
        console.log('');
    }
    if (report.changedStructs.length) {
        console.log(`Changed structs [${report.changedStructs.length}]:`);
        report.changedStructs.forEach(({ name, addedFields, removedFields, changedFields }) => {
            console.log(`  ${name}:`);
            addedFields.forEach((f) => console.log(`    + ${f.key}  (${f.type})`));
            removedFields.forEach((k) => console.log(`    - ${k}`));
            changedFields.forEach((f) => console.log(`    ~ ${f.key}  ${f.from} -> ${f.to}`));
        });
        console.log('');
    }

    console.log('None of this is applied automatically. For each item above, decide whether it belongs');
    console.log('in src/core/xray/schemas/**, add it with a comment citing the source, then add a label');
    console.log('via <FormField label={...} help={...}> (and <ExperimentalBadge /> if not in a tagged');
    console.log('release yet — check https://github.com/XTLS/Xray-core/releases).');
}

async function run() {
    const writeLock = process.argv.includes('--write-lock');

    console.log('Fetching current infra/conf structs from XTLS/Xray-core (main)...');
    const currentStructs = await fetchCurrentStructs();
    console.log(`Parsed ${Object.keys(currentStructs).length} structs.\n`);

    const lock = loadLock();
    const isFirstRun = !lock;
    const report = isFirstRun ? { newStructs: [], removedStructs: [], changedStructs: [] } : diff(lock.structs, currentStructs);

    printReport(report, isFirstRun);

    if (writeLock || isFirstRun) {
        let headCommit = null;
        try {
            const commits = await fetchJson(COMMITS_API_URL);
            if (Array.isArray(commits) && commits[0]) headCommit = commits[0].sha;
        } catch (e) {
            console.warn('Could not resolve latest infra/conf commit SHA (non-fatal):', e.message);
        }

        const newLock = {
            syncedAt: new Date().toISOString(),
            headCommit,
            structs: currentStructs,
        };
        fs.writeFileSync(LOCK_PATH, JSON.stringify(newLock, null, 2) + '\n', 'utf8');
        console.log(`\nLock file written: ${path.relative(process.cwd(), LOCK_PATH)}${headCommit ? ` (as of commit ${headCommit.slice(0, 8)})` : ''}`);
    } else if (report.newStructs.length + report.removedStructs.length + report.changedStructs.length > 0) {
        console.log('\n(Lock file NOT updated — re-run with --write-lock once you\'ve triaged the above.)');
    }
}

run().catch((err) => {
    console.error('xray-schema-diff failed:', err);
    process.exit(1);
});
