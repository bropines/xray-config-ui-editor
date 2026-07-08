import React, { useRef, useEffect, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
         rectangularSelection, highlightSpecialChars, crosshairCursor,
         lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap, linter, lintGutter } from "@codemirror/lint";
import { jsonLanguage, json } from "@codemirror/lang-json";
import { jsonc, jsoncLanguage } from "@platformos/lang-jsonc";
import { oneDark } from "@codemirror/theme-one-dark";
import Ajv from "ajv";
import xraySchema from "../../utils/config.schema.json";


const ajv = new Ajv({ allErrors: true, strict: false });

function findPathPosition(doc: string, path: string): { from: number; to: number } | null {
    if (!path || path === "/") return null;
    const segments = path.split('/').filter(Boolean);
    let currentIndex = 0;
    
    for (const segment of segments) {
        const isIndex = !isNaN(Number(segment));
        const query = isIndex ? null : `"${segment}"`;
        
        if (query) {
            const found = doc.indexOf(query, currentIndex);
            if (found !== -1) {
                currentIndex = found;
            } else {
                const foundFallback = doc.indexOf(segment, currentIndex);
                if (foundFallback !== -1) {
                    currentIndex = foundFallback;
                }
            }
        } else {
            // Ищем следующий открывающий объект или массив
            const foundBracket = doc.indexOf('{', currentIndex);
            if (foundBracket !== -1) {
                currentIndex = foundBracket;
            }
        }
    }
    
    if (currentIndex > 0) {
        const lastSegment = segments[segments.length - 1];
        const length = lastSegment ? lastSegment.length + 2 : 1; // длина с учетом кавычек
        return { from: currentIndex, to: Math.min(currentIndex + length, doc.length) };
    }
    return null;
}

const VALID_DISCRIMINATORS: Record<string, string[]> = {
    protocol: ["vless", "vmess", "trojan", "shadowsocks", "shadowsocks-2022", "socks", "http", "wireguard", "freedom", "blackhole", "dns", "loopback", "hysteria", "tun", "masquerade"],
    network: ["tcp", "kcp", "ws", "h2", "grpc", "httpupgrade", "xhttp", "raw"],
    security: ["none", "tls", "reality"]
};

const VALID_PROPERTIES_BY_DISCRIMINATOR: Record<string, string[]> = {
    vless: ["clients", "decryption", "fallback", "fallbacks", "vnext"],
    vmess: ["clients", "detour", "vnext"],
    trojan: ["clients", "fallback", "fallbacks", "servers"],
    shadowsocks: ["email", "method", "password", "network", "level", "servers"],
    "shadowsocks-2022": ["email", "method", "password", "network", "level", "servers"],
    socks: ["auth", "accounts", "udp", "ip", "timeout", "servers"],
    http: ["accounts", "allowTransparent", "timeout", "servers"],
    wireguard: ["secretKey", "peers", "address", "mtu", "reserved", "workers"],
    freedom: ["domainStrategy", "redirect", "userLevel"],
    blackhole: ["response"],
    dns: ["address", "port", "nonIPQuery"],
    loopback: ["inboundTag"],
    hysteria: ["auth", "auth_str", "up", "down", "up_mbps", "down_mbps", "obfs", "masq", "masqObject"],
    tun: ["name", "mtu", "acceptProxyProtocol", "routePrivateKey"],
    
    tcp: ["acceptProxyProtocol", "header"],
    kcp: ["mtu", "tti", "uplinkCapacity", "downlinkCapacity", "congestion", "readBufferSize", "writeBufferSize", "header"],
    ws: ["path", "headers"],
    h2: ["path", "host"],
    grpc: ["serviceName", "multiMode", "idleTimeout", "healthCheckTimeout", "permitWithoutStream", "initialWindowsSize"],
    httpupgrade: ["path", "host"],
    xhttp: ["path", "host", "mode", "extra"],
    
    tls: ["serverName", "rejectUnauthorized", "alpn", "minVersion", "maxVersion", "cipherSuites", "certificates", "disableSystemRoot"],
    reality: ["show", "dest", "xver", "serverNames", "privateKey", "minClientVer", "maxClientVer", "maxTimeDiff", "shortIds", "publicKey", "fingerprint", "spiderX", "shortId"]
};

const ALL_SETTINGS_BLOCKS = ["tcpSettings", "kcpSettings", "wsSettings", "httpSettings", "grpcSettings", "httpupgradeSettings", "xhttpSettings", "tlsSettings", "realitySettings"];

const VALID_SETTINGS_BLOCKS: Record<string, string> = {
    tcp: "tcpSettings",
    kcp: "kcpSettings",
    ws: "wsSettings",
    h2: "httpSettings",
    grpc: "grpcSettings",
    httpupgrade: "httpupgradeSettings",
    xhttp: "xhttpSettings",
    tls: "tlsSettings",
    reality: "realitySettings"
};

const INBOUND_PROTOCOL_BRANCH_MAPPING: Record<string, number[]> = {
    shadowsocks: [0],
    "shadowsocks-2022": [0],
    vmess: [1, 8],
    tun: [2],
    http: [3],
    trojan: [4],
    wireguard: [5],
    vless: [6],
    dokodemo: [7],
    "dokodemo-door": [7],
    socks: [9]
};

const OUTBOUND_PROTOCOL_BRANCH_MAPPING: Record<string, number[]> = {
    dokodemo: [0],
    "dokodemo-door": [0],
    shadowsocks: [1],
    "shadowsocks-2022": [1],
    socks: [3, 11],
    http: [3, 11],
    blackhole: [4],
    trojan: [5],
    wireguard: [6],
    vless: [7],
    dns: [8],
    freedom: [9],
    vmess: [10]
};

function getValueByPath(obj: any, path: string): any {
    const parts = path.split('/').filter(Boolean);
    let current = obj;
    for (const part of parts) {
        if (current && typeof current === 'object') {
            current = current[part];
        } else {
            return undefined;
        }
    }
    return current;
}

function findSiblingProtocol(parsedObj: any, path: string): string | null {
    const parts = path.split('/').filter(Boolean);
    for (let i = parts.length; i >= 0; i--) {
        const currentPath = '/' + parts.slice(0, i).join('/');
        const obj = getValueByPath(parsedObj, currentPath);
        if (obj && typeof obj === 'object' && obj.protocol) {
            return obj.protocol;
        }
    }
    return null;
}

function cleanAjvErrors(errors: any[], parsedObj: any): any[] {
    if (!errors) return [];

    // 1. Убираем общие ошибки объединений (anyOf/oneOf/allOf)
    let filtered = errors.filter(err => err.keyword !== 'anyOf' && err.keyword !== 'oneOf' && err.keyword !== 'allOf');

    // 2. Убираем ошибки дискриминаторов, если выбранное значение является валидным
    filtered = filtered.filter(err => {
        if (err.keyword === 'const' || err.keyword === 'enum') {
            const path = err.instancePath;
            const lastSegment = path.split('/').pop() || '';
            const validValues = VALID_DISCRIMINATORS[lastSegment];
            if (validValues) {
                const currentVal = getValueByPath(parsedObj, path);
                if (validValues.includes(currentVal)) {
                    // Значение валидно, ошибка "must be equal to constant" — это шум от других веток
                    return false;
                }
            }
        }
        return true;
    });

    // 3. Убираем ошибки "additionalProperties" от неактивных веток протоколов/сетей/безопасности
    filtered = filtered.filter(err => {
        if (err.keyword === 'additionalProperties') {
            const path = err.instancePath;
            const additionalProp = err.params?.additionalProperty;
            
            // Если это служебное свойство индекса "i" (используется UI), игнорируем ошибку
            if (additionalProp === 'i') {
                return false;
            }
            
            const pathParts = path.split('/').filter(Boolean);
            const foundDiscriminatorValues: string[] = [];

            // Собираем все дискриминаторы по всему пути снизу вверх
            for (let i = pathParts.length; i >= 0; i--) {
                const currentPath = '/' + pathParts.slice(0, i).join('/');
                const obj = getValueByPath(parsedObj, currentPath);
                if (obj && typeof obj === 'object') {
                    if (obj.protocol) foundDiscriminatorValues.push(obj.protocol);
                    if (obj.network) foundDiscriminatorValues.push(obj.network);
                    if (obj.streamSettings?.network) foundDiscriminatorValues.push(obj.streamSettings.network);
                    const sec = obj.security || obj.streamSettings?.security;
                    if (sec) foundDiscriminatorValues.push(sec);
                }
            }

            for (const value of foundDiscriminatorValues) {
                const validProps = VALID_PROPERTIES_BY_DISCRIMINATOR[value];
                if (validProps && validProps.includes(additionalProp)) {
                    return false;
                }

                if (ALL_SETTINGS_BLOCKS.includes(additionalProp)) {
                    const expectedBlock = VALID_SETTINGS_BLOCKS[value];
                    if (expectedBlock && additionalProp !== expectedBlock) {
                        return false;
                    }
                }
            }
        }
        return true;
    });

    // 4. Фильтруем ошибки неактивных веток anyOf для настроек входящих и исходящих соединений
    filtered = filtered.filter(err => {
        const schemaPath = err.schemaPath || "";
        
        // Проверяем исходящие
        const outboundMatch = schemaPath.match(/OutboundConfigurationObject\/anyOf\/(\d+)/);
        if (outboundMatch) {
            const branchIndex = parseInt(outboundMatch[1], 10);
            const protocol = findSiblingProtocol(parsedObj, err.instancePath);
            if (protocol) {
                const allowedBranches = OUTBOUND_PROTOCOL_BRANCH_MAPPING[protocol];
                if (allowedBranches && !allowedBranches.includes(branchIndex)) {
                    return false; // Скрываем ошибку, так как она относится к чужой ветке протокола
                }
            }
        }

        // Проверяем входящие
        const inboundMatch = schemaPath.match(/InboundConfigurationObject\/anyOf\/(\d+)/);
        if (inboundMatch) {
            const branchIndex = parseInt(inboundMatch[1], 10);
            const protocol = findSiblingProtocol(parsedObj, err.instancePath);
            if (protocol) {
                const allowedBranches = INBOUND_PROTOCOL_BRANCH_MAPPING[protocol];
                if (allowedBranches && !allowedBranches.includes(branchIndex)) {
                    return false; // Скрываем ошибку
                }
            }
        }

        return true;
    });

    return filtered;
}

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse';
    mode?: 'json' | 'plaintext';
}

export const JsonEditor = ({ value, onChange, readOnly = false, schemaMode = 'full', mode = 'json' }: JsonEditorProps) => {
    const editorParent = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const isJson = mode === 'json';

    // Подготовка схемы
    const schemaForMode = useMemo(() => {
        if (!isJson) return null;
        const definitions = (xraySchema as any).definitions || {};
        switch (schemaMode) {
            case 'full': 
                return xraySchema;
            case 'inbound': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/InboundDetourConfig",
                    definitions
                };
            case 'outbound': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/OutboundDetourConfig",
                    definitions
                };
            case 'rule': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/RouterRule",
                    definitions
                };
            case 'routing': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/RouterConfig",
                    definitions
                };
            case 'dns': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/DNSConfig",
                    definitions
                };
            case 'balancer': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/BalancingRule",
                    definitions
                };
            case 'reverse': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    $ref: "#/definitions/ReverseConfig",
                    definitions
                };
            case 'inbounds': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    type: "array",
                    items: { $ref: "#/definitions/InboundDetourConfig" },
                    definitions
                };
            case 'outbounds': 
                return {
                    $schema: "http://json-schema.org/draft-07/schema#",
                    type: "array",
                    items: { $ref: "#/definitions/OutboundDetourConfig" },
                    definitions
                };
            default: 
                return xraySchema;
        }
    }, [schemaMode, isJson]);

    // Единый линтер (синтаксис + схема)
    const customLinter = useMemo(() => {
        if (!isJson || !schemaForMode) return null;
        const validate = ajv.compile(schemaForMode);
        return linter((view) => {
            const diagnostics: any[] = [];
            const doc = view.state.doc.toString();
            if (!doc.trim()) return [];

            try {
                const cleanJson = doc.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => group1 || "");
                const parsed = JSON.parse(cleanJson);
                const valid = validate(parsed);

                if (!valid && validate.errors) {
                    const cleanErrors = cleanAjvErrors(validate.errors, parsed);
                    cleanErrors.forEach(err => {
                        const pos = findPathPosition(doc, err.instancePath);
                        diagnostics.push({
                            from: pos ? pos.from : 0,
                            to: pos ? pos.to : view.state.doc.length,
                            severity: "error",
                            message: `Schema: ${err.instancePath} ${err.message}`,
                        });
                    });
                }
            } catch (e: any) {
                let from = 0;
                let to = view.state.doc.length;
                const posMatch = e.message.match(/position (\d+)/i);
                if (posMatch) {
                    const pos = parseInt(posMatch[1], 10);
                    from = Math.max(0, pos - 1);
                    to = Math.min(view.state.doc.length, pos + 1);
                }
                diagnostics.push({
                    from,
                    to,
                    severity: "error",
                    message: e.message || "Invalid JSON syntax",
                });
            }
            return diagnostics;
        });
    }, [schemaForMode, isJson]);

    // --- УЛУЧШЕННАЯ АВТОПОДСТАНОВКА (COMPLETION) ---
    const customCompletion = useMemo(() => {
        if (!isJson) return null;
        return jsoncLanguage.data.of({
            autocomplete: (context: any) => {
                const word = context.matchBefore(/[\w"]*/);
                if (!word || (word.from === word.to && !context.explicit)) return null;

                const doc = context.state.doc.toString();
                const options: any[] = [];
                // Функция для рекурсивного поиска ключей в схеме
                const getKeysFromSchema = (schema: any): string[] => {
                    if (!schema) return [];
                    if (schema.$ref) {
                        const ref = schema.$ref.split('/').pop();
                        const defs = (xraySchema as any).definitions || {};
                        return getKeysFromSchema(defs[ref]);
                    }
                    if (schema.properties) return Object.keys(schema.properties);
                    if (schema.items) return getKeysFromSchema(schema.items);
                    if (schema.anyOf) {
                        const keys: string[] = [];
                        schema.anyOf.forEach((s: any) => keys.push(...getKeysFromSchema(s)));
                        return Array.from(new Set(keys));
                    }
                    if (schema.allOf) {
                        const keys: string[] = [];
                        schema.allOf.forEach((s: any) => keys.push(...getKeysFromSchema(s)));
                        return Array.from(new Set(keys));
                    }
                    if (schema.oneOf) {
                        const keys: string[] = [];
                        schema.oneOf.forEach((s: any) => keys.push(...getKeysFromSchema(s)));
                        return Array.from(new Set(keys));
                    }
                    return [];
                };

                // Определяем текущий набор ключей
                const availableKeys = getKeysFromSchema(schemaForMode);
                
                availableKeys.forEach(key => {
                    options.push({ 
                        label: `"${key}"`, 
                        type: "property", 
                        apply: `"${key}": `,
                        detail: "schema property"
                    });
                });

                // Добавляем значения для протоколов, если мы в поле "protocol"
                const line = doc.slice(0, context.pos).split('\n').pop() || "";
                if (line.includes('"protocol"')) {
                    const protocols = ["vless", "vmess", "trojan", "shadowsocks", "hysteria", "socks", "http", "wireguard", "freedom", "blackhole"];
                    protocols.forEach(p => options.push({ label: `"${p}"`, type: "keyword", detail: "protocol" }));
                }

                return {
                    from: word.from,
                    options: options,
                    filter: false // Позволяем CodeMirror самому фильтровать по вводу
                };
            }
        });
    }, [schemaForMode, isJson]);

    useEffect(() => {
        if (!editorParent.current) return;

        const extensions = [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...lintKeymap
            ]),
            oneDark,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange(update.state.doc.toString());
                }
            }),
            EditorView.editable.of(!readOnly),
            EditorState.readOnly.of(readOnly),
            EditorView.theme({
                "&": { height: "100%", backgroundColor: "#1e1e1e" },
                "&.cm-focused": { outline: "none" },
                ".cm-scroller": {
                    overflow: "auto !important",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#334155 #0f172a",
                    height: "100%",
                    maxHeight: "100%"
                },
                ".cm-scroller::-webkit-scrollbar": {
                    width: "10px",
                    height: "10px"
                },
                ".cm-scroller::-webkit-scrollbar-track": {
                    background: "#0f172a"
                },
                ".cm-scroller::-webkit-scrollbar-thumb": {
                    background: "#334155",
                    borderRadius: "10px",
                    border: "3px solid #0f172a"
                },
                ".cm-scroller::-webkit-scrollbar-thumb:hover": {
                    background: "#475569"
                },
                ".cm-gutters": {
                    backgroundColor: "#1e1e1e",
                    color: "#6b7280",
                    border: "none"
                },
                ".cm-activeLineGutter": {
                    backgroundColor: "#2d3748",
                    color: "#e2e8f0"
                },
                ".cm-tooltip": {
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                },
                ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
                    backgroundColor: "#312e81",
                    color: "white"
                }
            })
        ];

        if (isJson) {
            extensions.push(
                jsonc(),
                autocompletion({
                    defaultKeymap: true,
                    aboveCursor: true,
                    activateOnTyping: true,
                    icons: true
                }),
                customCompletion!,
                lintGutter(),
                customLinter!
            );
        }

        const state = EditorState.create({
            doc: value,
            extensions
        });

        const view = new EditorView({
            state,
            parent: editorParent.current
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, [schemaMode, readOnly]); 

    useEffect(() => {
        if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: value }
            });
        }
    }, [value]);

    return (
        <div 
            ref={editorParent} 
            className="h-full w-full bg-[#1e1e1e] overflow-hidden flex flex-col font-mono text-[13px] border border-slate-700 rounded-lg shadow-inner"
        >
            <style>{`
                .cm-editor { height: 100% !important; outline: none !important; }
                .cm-scroller { font-family: 'JetBrains Mono', monospace !important; }
                .cm-content { padding-bottom: 100px !important; }
                .cm-gutterElement { font-size: 11px; opacity: 0.5; }
                /* Исправление отображения ошибок */
                .cm-lintRange-error { background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3">%3Cpath d="M0 3 L3 0 L6 3" fill="none" stroke="%23f87171" stroke-width="1"/%3E</svg>'); background-position: bottom left; background-repeat: repeat-x; }
            `}</style>
        </div>
    );
};