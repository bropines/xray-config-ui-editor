const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_API_URL = 'https://api.github.com/repos/XTLS/Xray-core/contents/infra/conf';
const RAW_URL_PREFIX = 'https://raw.githubusercontent.com/XTLS/Xray-core/main/infra/conf/';

const OUTPUT_SCHEMA_PATH = path.join(__dirname, '../src/utils/config.schema.json');
const OUTPUT_TYPES_PATH = path.join(__dirname, '../src/core/xray-config.d.ts');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Map Go types to JSON Schema types
function mapGoTypeToSchema(goType) {
    goType = goType.trim();
    if (goType.startsWith('*')) {
        goType = goType.substring(1);
    }

    if (goType.startsWith('interface{') || goType === 'interface') {
        return { type: 'object', additionalProperties: true };
    }
    if (goType === 'string' || goType === 'Domain') return { type: 'string' };
    if (['int', 'int16', 'int32', 'int64', 'uint', 'uint16', 'uint32', 'uint64', 'uint8', 'int8', 'byte', 'float32', 'float64', 'router.StrategyWeight'].includes(goType)) {
        return { type: 'integer' };
    }
    if (goType === 'bool') return { type: 'boolean' };
    if (goType === 'json.RawMessage') return {}; // Any JSON value
    if (goType === 'ConfigCreatorCache') return { type: 'object', additionalProperties: true };
    if (['Address', 'net.Address', 'net.IPOrDomain', 'IPOrDomain'].includes(goType)) {
        return { type: 'string', description: 'IP Address or Domain Name' };
    }
    if (['PortRange', 'net.PortRange', 'duration.Duration', 'Duration'].includes(goType)) {
        return { anyOf: [{ type: 'integer' }, { type: 'string' }], description: 'Port/Duration range or string representation' };
    }
    if (['PortList', 'net.PortList'].includes(goType)) {
        return { anyOf: [{ type: 'integer' }, { type: 'string' }], description: 'Port, port list, or range' };
    }
    if (['StringList', 'NetworkList'].includes(goType)) {
        return { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] };
    }
    if (['Network', 'TransportProtocol', 'Bandwidth'].includes(goType)) {
        return { type: 'string' };
    }

    if (goType.startsWith('[]')) {
        const itemType = goType.substring(2);
        return {
            type: 'array',
            items: mapGoTypeToSchema(itemType)
        };
    }

    if (goType.startsWith('map[')) {
        const mapMatch = goType.match(/^map\[([^\]]+)\](.*)$/);
        if (mapMatch) {
            const valType = mapMatch[2];
            return {
                type: 'object',
                additionalProperties: mapGoTypeToSchema(valType)
            };
        }
    }

    // Default to struct definition ref
    return { $ref: `#/definitions/${goType}` };
}

// Map Go types to TypeScript types
function mapGoTypeToTS(goType) {
    goType = goType.trim();
    if (goType.startsWith('*')) {
        goType = goType.substring(1);
    }
    if (goType.startsWith('interface{') || goType === 'interface') {
        return 'any';
    }
    if (goType === 'string' || goType === 'Domain') return 'string';
    if (['int', 'int16', 'int32', 'int64', 'uint', 'uint16', 'uint32', 'uint64', 'uint8', 'int8', 'byte', 'float32', 'float64', 'router.StrategyWeight'].includes(goType)) {
        return 'number';
    }
    if (goType === 'bool') return 'boolean';
    if (goType === 'json.RawMessage') return 'any';
    if (goType === 'ConfigCreatorCache') return 'Record<string, any>';
    if (['Address', 'net.Address', 'net.IPOrDomain', 'IPOrDomain'].includes(goType)) {
        return 'string';
    }
    if (['PortRange', 'net.PortRange', 'duration.Duration', 'Duration'].includes(goType)) {
        return 'number | string';
    }
    if (['PortList', 'net.PortList'].includes(goType)) {
        return 'number | string';
    }
    if (['StringList', 'NetworkList'].includes(goType)) {
        return 'string | string[]';
    }
    if (['Network', 'TransportProtocol', 'Bandwidth'].includes(goType)) {
        return 'string';
    }
    if (goType.startsWith('[]')) {
        const itemType = goType.substring(2);
        const tsItem = mapGoTypeToTS(itemType);
        return tsItem.includes('|') ? `(${tsItem})[]` : `${tsItem}[]`;
    }
    if (goType.startsWith('map[')) {
        const mapMatch = goType.match(/^map\[([^\]]+)\](.*)$/);
        if (mapMatch) {
            const keyType = mapGoTypeToTS(mapMatch[1]);
            const valType = mapGoTypeToTS(mapMatch[2]);
            return `Record<${keyType}, ${valType}>`;
        }
    }
    return goType;
}

async function run() {
    console.log('Fetching file list from XTLS/Xray-core repo...');
    const files = await fetchJson(REPO_API_URL);
    if (!Array.isArray(files)) {
        throw new Error('Could not fetch file list from GitHub: ' + JSON.stringify(files));
    }

    const goFiles = files.filter(f => f.name.endsWith('.go') && !f.name.endsWith('_test.go'));
    console.log(`Found ${goFiles.length} Go source files to parse.`);

    const structs = {};

    for (const fileInfo of goFiles) {
        console.log(`Downloading and parsing ${fileInfo.name}...`);
        const content = await fetchText(fileInfo.download_url);

        // Regex to capture struct definitions and preceding comments
        const structRegex = /(?:((?:\/\/[^\n]*\n)+)\s*)?type\s+(\w+)\s+struct\s*\{([\s\S]*?)\}/g;
        let match;
        while ((match = structRegex.exec(content)) !== null) {
            const comments = match[1] || '';
            const structName = match[2];
            const structBody = match[3];

            const description = comments.split('\n')
                .map(line => line.replace(/^\s*\/\/\s*/, '').trim())
                .filter(Boolean)
                .join('\n');

            const fieldRegex = /^\s*(\w+)\s+([\w\*\[\]\.\{\}]+)(?:\s+`json:"([^"]+)"`)?/gm;
            let fieldMatch;
            const fields = [];
            while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                // Extract json name and ignore modifiers like omitempty
                const jsonTag = fieldMatch[3] ? fieldMatch[3].split(',')[0] : null;

                fields.push({
                    name: fieldName,
                    type: fieldType,
                    jsonKey: jsonTag
                });
            }

            structs[structName] = {
                name: structName,
                description,
                fields
            };
        }
    }

    console.log(`Parsed ${Object.keys(structs).length} structures in total.`);

    if (structs['StreamConfig']) {
        structs['StreamConfig'].fields.push({
            name: 'Flow',
            type: 'string',
            jsonKey: 'flow'
        });
    }

    // Build JSON Schema definitions
    const definitions = {};
    Object.keys(structs).forEach(name => {
        const s = structs[name];
        const properties = {};
        const required = [];

        s.fields.forEach(f => {
            const jsonKey = f.jsonKey || f.name;
            if (jsonKey === '-') return; // skip ignored fields

            const propSchema = mapGoTypeToSchema(f.type);
            if (s.description) {
                propSchema.description = s.description;
            }
            properties[jsonKey] = propSchema;
        });

        definitions[name] = {
            type: 'object',
            description: s.description || undefined,
            properties,
            additionalProperties: false
        };
    });

    // Write JSON Schema File
    const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'Xray-core Configuration Schema (Auto-generated)',
        type: 'object',
        properties: {
            log: { $ref: '#/definitions/LogConfig' },
            api: { $ref: '#/definitions/APIConfig' },
            dns: { $ref: '#/definitions/DNSConfig' },
            routing: { $ref: '#/definitions/RouterConfig' },
            policy: { $ref: '#/definitions/PolicyConfig' },
            inbounds: {
                type: 'array',
                items: { $ref: '#/definitions/InboundDetourConfig' }
            },
            outbounds: {
                type: 'array',
                items: { $ref: '#/definitions/OutboundDetourConfig' }
            },
            stats: { $ref: '#/definitions/StatsConfig' },
            reverse: { $ref: '#/definitions/ReverseConfig' },
            fakedns: {
                anyOf: [
                    { type: 'array', items: { $ref: '#/definitions/FakeDNSConfig' } },
                    { $ref: '#/definitions/FakeDNSConfig' }
                ]
            }
        },
        definitions
    };

    // Custom overrides to handle Go's JSON custom Unmarshalers
    if (schema.definitions['DNSConfig']) {
        // 1. servers can be string or NameServerConfig
        schema.definitions['DNSConfig'].properties['servers'] = {
            type: 'array',
            items: {
                anyOf: [
                    { type: 'string' },
                    { $ref: '#/definitions/NameServerConfig' }
                ]
            }
        };
        // 2. hosts is mapped as a flat key-value dictionary in JSON (not a wrapped struct)
        schema.definitions['DNSConfig'].properties['hosts'] = {
            type: 'object',
            additionalProperties: {
                anyOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } },
                    { $ref: '#/definitions/HostAddress' }
                ]
            }
        };
    }

    // 3. FakeDNSConfig custom unmarshaler: can be a single pool element or array of pool elements
    schema.definitions['FakeDNSConfig'] = {
        anyOf: [
            { $ref: '#/definitions/FakeDNSPoolElementConfig' },
            { type: 'array', items: { $ref: '#/definitions/FakeDNSPoolElementConfig' } }
        ]
    };

    fs.mkdirSync(path.dirname(OUTPUT_SCHEMA_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`Successfully generated JSON Schema: ${OUTPUT_SCHEMA_PATH}`);

    // Generate TypeScript d.ts file
    let tsContent = `// Auto-generated TypeScript types for Xray-core configuration\n\n`;
    tsContent += `export type NameServerConfigOrString = string | NameServerConfig;\n\n`;

    Object.keys(structs).forEach(name => {
        const s = structs[name];
        if (name === 'FakeDNSConfig') {
            tsContent += `export type FakeDNSConfig = FakeDNSPoolElementConfig | FakeDNSPoolElementConfig[];\n\n`;
            return;
        }
        if (s.description) {
            tsContent += `/**\n * ${s.description.split('\n').join('\n * ')}\n */\n`;
        }
        tsContent += `export interface ${name} {\n`;
        s.fields.forEach(f => {
            const jsonKey = f.jsonKey || f.name;
            if (jsonKey === '-') return;
            
            let tsType = mapGoTypeToTS(f.type);
            // Custom TS overrides for custom Unmarshalers
            if (name === 'DNSConfig' && jsonKey === 'servers') {
                tsType = 'NameServerConfigOrString[]';
            }
            if (name === 'DNSConfig' && jsonKey === 'hosts') {
                tsType = 'Record<string, string | string[] | HostAddress>';
            }
            
            tsContent += `    ${jsonKey}?: ${tsType};\n`;
        });
        tsContent += `}\n\n`;
    });

    // Add root interface
    tsContent += `export interface XrayConfig {\n`;
    tsContent += `    log?: LogConfig;\n`;
    tsContent += `    api?: APIConfig;\n`;
    tsContent += `    dns?: DNSConfig;\n`;
    tsContent += `    routing?: RouterConfig;\n`;
    tsContent += `    policy?: PolicyConfig;\n`;
    tsContent += `    inbounds?: InboundDetourConfig[];\n`;
    tsContent += `    outbounds?: OutboundDetourConfig[];\n`;
    tsContent += `    stats?: StatsConfig;\n`;
    tsContent += `    reverse?: ReverseConfig;\n`;
    tsContent += `    fakedns?: FakeDNSConfig | FakeDNSConfig[];\n`;
    tsContent += `}\n`;

    fs.mkdirSync(path.dirname(OUTPUT_TYPES_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_TYPES_PATH, tsContent, 'utf8');
    console.log(`Successfully generated TypeScript typings: ${OUTPUT_TYPES_PATH}`);
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
