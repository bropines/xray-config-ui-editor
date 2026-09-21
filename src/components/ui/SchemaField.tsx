import React from 'react';
import { z } from 'zod';
import { FormField } from './FormField';
import { Select } from './Select';
import { Switch } from './Switch';
import { SmartTagInput } from './SmartTagInput';
import { NumberInput } from './NumberInput';
import { DurationInput, type TimeUnit } from './DurationInput';
import { Icon } from './Icon';
import { generateRealityShortIds, generateX25519Keys, generateSpiderPath } from '../../core/generators';
import { toast } from 'sonner';
import { t } from '../../i18n';

// Helper to inspect the Zod type at runtime
export function getSchemaTypeAndDetails(schema: z.ZodTypeAny): {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array' | 'unknown';
    options?: string[];
    innerSchema?: z.ZodTypeAny;
} {
    let current = schema;
    
    // Unwrap optional, nullable, default
    while (
        current instanceof z.ZodOptional ||
        current instanceof z.ZodNullable ||
        current._def.typeName === 'ZodOptional' ||
        current._def.typeName === 'ZodNullable' ||
        current._def.typeName === 'ZodDefault'
    ) {
        current = (current as any).unwrap ? (current as any).unwrap() : (current as any)._def.innerType;
    }

    const typeName = current._def?.typeName;

    if (current instanceof z.ZodString || typeName === 'ZodString') {
        return { type: 'string' };
    }
    if (current instanceof z.ZodNumber || typeName === 'ZodNumber') {
        return { type: 'number' };
    }
    if (current instanceof z.ZodBoolean || typeName === 'ZodBoolean') {
        return { type: 'boolean' };
    }
    if (current instanceof z.ZodEnum || typeName === 'ZodEnum') {
        return { type: 'enum', options: (current as any).options };
    }
    if (current instanceof z.ZodObject || typeName === 'ZodObject') {
        return { type: 'object', innerSchema: current };
    }
    if (current instanceof z.ZodArray || typeName === 'ZodArray') {
        return { type: 'array', innerSchema: (current as any).element };
    }
    if (current instanceof z.ZodUnion || typeName === 'ZodUnion') {
        const options = (current as any)._def.options || [];
        
        // 1. Check if any union branch is an enum with defined options
        for (const opt of options) {
            const details = getSchemaTypeAndDetails(opt);
            if (details.type === 'enum' && details.options && details.options.length > 0) {
                return details;
            }
        }

        // 2. Check if all union branches are literals (e.g. z.literal(0) | z.literal(1))
        const literalValues = options
            .filter((opt: any) => opt instanceof z.ZodLiteral || opt._def?.typeName === 'ZodLiteral')
            .map((opt: any) => String(opt._def?.value ?? (opt as any).value));
        if (literalValues.length > 0 && literalValues.length === options.length) {
            return { type: 'enum', options: literalValues };
        }

        // 3. Check for string fallback
        const hasString = options.some((opt: any) => {
            let u = opt;
            while (
                u instanceof z.ZodOptional || u instanceof z.ZodNullable ||
                u._def.typeName === 'ZodOptional' || u._def.typeName === 'ZodNullable' || u._def.typeName === 'ZodDefault'
            ) {
                u = u.unwrap ? u.unwrap() : u._def.innerType;
            }
            return u instanceof z.ZodString || u._def?.typeName === 'ZodString';
        });
        if (hasString) {
            return { type: 'string' };
        }
        for (const opt of options) {
            const details = getSchemaTypeAndDetails(opt);
            if (details.type !== 'unknown') {
                return details;
            }
        }
    }

    return { type: 'unknown' };
}

export const DURATION_FIELD_SPECS: Record<string, { defaultUnit: TimeUnit; mode: 'string' | 'number'; baseUnit?: TimeUnit }> = {
    probeInterval: { defaultUnit: 'm', mode: 'string' },
    interval: { defaultUnit: 'm', mode: 'string' },
    timeout: { defaultUnit: 's', mode: 'string' },
    maxRTT: { defaultUnit: 's', mode: 'string' },
    handshake: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    connIdle: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    uplinkOnly: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    downlinkOnly: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    timeoutMs: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    serveExpiredTTL: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    refresh: { defaultUnit: 'm', mode: 'number', baseUnit: 'm' },
    tcpKeepAliveIdle: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tcpKeepAliveInterval: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tcpUserTimeout: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    scMinPostsIntervalMs: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    hKeepAlivePeriod: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    maxTimeDiff: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    deduplication: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    idle_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    health_check_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    max_idle_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    handshake_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    keepAlive: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tti: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' }
};

export interface SchemaFieldProps {
    name: string;
    schema: z.ZodTypeAny | undefined;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    label?: string;
    help?: string;
    placeholder?: string;
    options?: string[];
    type?: 'string' | 'number' | 'boolean' | 'enum' | 'duration' | 'array';
    unitOptions?: TimeUnit[];
    defaultUnit?: TimeUnit;
    durationMode?: 'string' | 'number';
    baseUnit?: TimeUnit;
    /**
     * Real paths on the REALITY target, when the user has supplied any. The
     * spiderX dice draws from them in preference to inventing one. Passed in
     * rather than read from the store: this folder stays store-independent.
     */
    spiderPaths?: string[];
}

export const SchemaField = ({
    name,
    schema,
    value,
    onChange,
    error,
    label,
    help,
    placeholder,
    options,
    type,
    unitOptions,
    defaultUnit,
    durationMode,
    baseUnit,
    spiderPaths
}: SchemaFieldProps) => {
    const [genPublicKey, setGenPublicKey] = React.useState<string | null>(null);

    // Check if explicitly configured as duration or recognized by field name
    const isDuration = type === 'duration' || name in DURATION_FIELD_SPECS || !!durationMode;
    const fieldLabel = label ?? name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    if (isDuration) {
        const spec = DURATION_FIELD_SPECS[name];
        const effectiveMode = durationMode ?? spec?.mode ?? 'string';
        const effectiveDefaultUnit = defaultUnit ?? spec?.defaultUnit ?? 's';
        const effectiveBaseUnit = baseUnit ?? spec?.baseUnit ?? 's';
        const effectiveUnitOptions = unitOptions ?? ['ms', 's', 'm', 'h'];

        return (
            <FormField label={fieldLabel} help={help} error={error}>
                <DurationInput
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    mode={effectiveMode}
                    defaultUnit={effectiveDefaultUnit}
                    baseUnit={effectiveBaseUnit}
                    unitOptions={effectiveUnitOptions}
                />
            </FormField>
        );
    }

    // If schema is not provided, fallback to string type
    const details = schema ? getSchemaTypeAndDetails(schema) : { type: 'string' as const };
    if (options && options.length > 0) {
        details.type = 'enum';
        details.options = options;
    }

    switch (details.type) {
        case 'boolean':
            return (
                <FormField label={fieldLabel} help={help} error={error} horizontal={true}>
                    <Switch checked={!!value} onChange={onChange} />
                </FormField>
            );
        case 'enum':
            return (
                <FormField label={fieldLabel} help={help} error={error}>
                    <Select
                        value={value || ''}
                        onChange={onChange}
                        options={(details.options || []).map(opt => ({
                            value: opt,
                            label: opt,
                            description: `Configure ${opt}`
                        }))}
                    />
                </FormField>
            );
        case 'number':
            return (
                <FormField label={fieldLabel} help={help} error={error}>
                    <NumberInput
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                    />
                </FormField>
            );
        case 'array': {
            const innerDetails = details.innerSchema ? getSchemaTypeAndDetails(details.innerSchema) : { type: 'string' as const };
            const isNumber = innerDetails.type === 'number';
            const isIpField = name.toLowerCase().includes('ip') || name.toLowerCase() === 'source';
            const isShortIds = name === 'shortIds';
            
            const handleArrayChange = (stringItems: string[]) => {
                if (isNumber) {
                    onChange(stringItems.map(Number).filter(n => !isNaN(n)));
                } else {
                    onChange(stringItems);
                }
            };

            const displayValue = Array.isArray(value)
                ? value.map(String)
                : [];

            const allowedPattern = isIpField ? /[^0-9a-zA-Z./:, ]/g : undefined;

            // Appends rather than replaces: the old behaviour overwrote the
            // whole list with three fresh ids, throwing away shortIds that
            // clients in the field are already handshaking with.
            const handleAction = isShortIds ? () => {
                const existing = displayValue;
                handleArrayChange([...existing, ...generateRealityShortIds(1, { existing })]);
            } : undefined;

            return (
                <FormField label={fieldLabel} help={help} error={error}>
                    <SmartTagInput
                        label=""
                        prefix=""
                        placeholder={placeholder ?? (isNumber ? t("e.g. 100, 200...") : t("Type and press Enter or Comma..."))}
                        value={displayValue}
                        onChange={handleArrayChange}
                        allowedPattern={allowedPattern}
                        actionIcon={isShortIds ? "DiceFive" : undefined}
                        actionTooltip={isShortIds ? t("Add a generated shortId") : undefined}
                        onActionClick={handleAction}
                    />
                </FormField>
            );
        }
        case 'string':
        default: {
            const isPortField = name.toLowerCase().includes('port');
            const isShortId = name === 'shortId';
            const isPrivateKey = name === 'privateKey';
            // The generator sits on the field rather than in a toolbar above
            // the form, so it is present wherever spiderX renders — including
            // a server inbound that already carries one.
            const isSpiderX = name === 'spiderX';
            
            const handleAction = isShortId ? () => {
                const generated = generateRealityShortIds(1)[0];
                onChange(generated);
            } : isSpiderX ? () => {
                // Passing the current value keeps a second click from handing
                // back what is already in the field. The user's own paths, if
                // they pasted any, beat anything generated here.
                onChange(generateSpiderPath({
                    avoid: typeof value === 'string' ? value : undefined,
                    pool: spiderPaths,
                }));
            } : isPrivateKey ? () => {
                const keys = generateX25519Keys();
                onChange(keys.privateKey);
                setGenPublicKey(keys.publicKey);
                toast.success(t("Keys Pair Generated!"));
            } : undefined;

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                let val = e.target.value;
                if (isPortField) {
                    val = val.replace(/[^0-9,-]/g, '');
                    const segments = val.split(/[,-]/);
                    if (segments.some(seg => seg.length > 5)) {
                        return;
                    }
                }
                onChange(val === '' ? undefined : val);
            };

            const handleIncrement = () => {
                if (!value) {
                    onChange('80');
                    return;
                }
                const valStr = String(value);
                if (/^\d+$/.test(valStr)) {
                    const num = Number(valStr);
                    if (num < 65535) {
                        onChange(String(num + 1));
                    }
                }
            };

            const handleDecrement = () => {
                if (!value) {
                    onChange('80');
                    return;
                }
                const valStr = String(value);
                if (/^\d+$/.test(valStr)) {
                    const num = Number(valStr);
                    if (num > 0) {
                        onChange(String(num - 1));
                    }
                }
            };

            return (
                <div className="space-y-2 w-full">
                    <FormField label={fieldLabel} help={help} error={error}>
                        <div className="relative flex items-center w-full">
                            <input
                                type="text"
                                className={`input-base font-mono ${isPortField || isShortId || isPrivateKey || isSpiderX ? 'pr-12' : ''}`}
                                placeholder={placeholder}
                                value={value !== undefined && value !== null ? value : ''}
                                onChange={handleChange}
                            />
                            {isPortField && (
                                <div className="absolute right-1 flex flex-col h-[34px] justify-between border-l border-slate-800/80 pl-2 pr-1.5 select-none">
                                    <button
                                        type="button"
                                        onClick={handleIncrement}
                                        className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px]"
                                    >
                                        <Icon name="CaretUp" weight="bold" className="text-[10px]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDecrement}
                                        className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px]"
                                    >
                                        <Icon name="CaretDown" weight="bold" className="text-[10px]" />
                                    </button>
                                </div>
                            )}
                            {(isShortId || isPrivateKey || isSpiderX) && (
                                <div className="absolute right-1 flex items-center h-[34px] border-l border-slate-800/80 pl-2 pr-1.5 select-none">
                                    <button
                                        type="button"
                                        onClick={handleAction}
                                        title={isPrivateKey ? t("Gen Keys Pair")
                                            : isSpiderX ? (spiderPaths && spiderPaths.length > 0
                                                ? t("Take a path from your list ({n})", { n: spiderPaths.length })
                                                : t("Generate a spiderX path"))
                                            : t("Gen Short ID")}
                                        className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-full w-[24px]"
                                    >
                                        <Icon name="DiceFive" weight="bold" className="text-sm" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </FormField>
                    {isPrivateKey && genPublicKey && (
                        <div className="bg-emerald-950/20 border border-emerald-500/50 p-3 rounded-lg animate-in fade-in duration-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{t("Generated Public Key")}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(genPublicKey);
                                        toast.success(t("Public Key copied!"));
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                                >
                                    <Icon name="Copy" className="text-xs" />
{t("Copy")}
</button>
                            </div>
                            <code className="block bg-black/40 p-2 rounded text-xs font-mono break-all text-emerald-200">{genPublicKey}</code>
                        </div>
                    )}
                </div>
            );
        }
    }
};
