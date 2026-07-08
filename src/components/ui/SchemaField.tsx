import React from 'react';
import { z } from 'zod';
import { FormField } from './FormField';
import { Select } from './Select';
import { Switch } from './Switch';
import { SmartTagInput } from './SmartTagInput';
import { NumberInput } from './NumberInput';
import { Icon } from './Icon';
import { generateRealityShortIds } from '../../utils/generators';
import { generateX25519Keys } from '../../utils/crypto';
import { toast } from 'sonner';

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

interface SchemaFieldProps {
    name: string;
    schema: z.ZodTypeAny | undefined;
    value: any;
    onChange: (value: any) => void;
    error?: string;
    label?: string;
    help?: string;
    placeholder?: string;
    options?: string[];
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
    options
}: SchemaFieldProps) => {
    const [genPublicKey, setGenPublicKey] = React.useState<string | null>(null);
    // If schema is not provided, fallback to string type
    const details = schema ? getSchemaTypeAndDetails(schema) : { type: 'string' as const };
    if (options && options.length > 0) {
        details.type = 'enum';
        details.options = options;
    }
    const fieldLabel = label ?? name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

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

            const handleAction = isShortIds ? () => {
                const generated = generateRealityShortIds(3);
                handleArrayChange(generated);
            } : undefined;

            return (
                <FormField label={fieldLabel} help={help} error={error}>
                    <SmartTagInput
                        label=""
                        prefix=""
                        placeholder={placeholder ?? (isNumber ? "e.g. 100, 200..." : "Type and press Enter or Comma...")}
                        value={displayValue}
                        onChange={handleArrayChange}
                        allowedPattern={allowedPattern}
                        actionIcon={isShortIds ? "DiceFive" : undefined}
                        actionTooltip={isShortIds ? "Gen Short IDs List" : undefined}
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
            
            const handleAction = isShortId ? () => {
                const generated = generateRealityShortIds(1)[0];
                onChange(generated);
            } : isPrivateKey ? () => {
                const keys = generateX25519Keys();
                onChange(keys.privateKey);
                setGenPublicKey(keys.publicKey);
                toast.success("Keys Pair Generated!");
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
                                className={`input-base font-mono ${isPortField || isShortId || isPrivateKey ? 'pr-12' : ''}`}
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
                            {(isShortId || isPrivateKey) && (
                                <div className="absolute right-1 flex items-center h-[34px] border-l border-slate-800/80 pl-2 pr-1.5 select-none">
                                    <button
                                        type="button"
                                        onClick={handleAction}
                                        title={isPrivateKey ? "Gen Keys Pair" : "Gen Short ID"}
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
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Generated Public Key</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(genPublicKey);
                                        toast.success("Public Key copied!");
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                                >
                                    <Icon name="Copy" className="text-xs" /> Copy
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
