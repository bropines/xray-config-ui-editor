import React from 'react';
import { z } from 'zod';
import { FormField } from './FormField';
import { Select } from './Select';
import { Switch } from './Switch';

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
}

export const SchemaField = ({
    name,
    schema,
    value,
    onChange,
    error,
    label,
    help,
    placeholder
}: SchemaFieldProps) => {
    // If schema is not provided, fallback to string type
    const details = schema ? getSchemaTypeAndDetails(schema) : { type: 'string' as const };
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
                    <input
                        type="number"
                        className="input-base"
                        placeholder={placeholder}
                        value={value !== undefined && value !== null ? value : ''}
                        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                </FormField>
            );
        case 'string':
        default:
            return (
                <FormField label={fieldLabel} help={help} error={error}>
                    <input
                        type="text"
                        className="input-base"
                        placeholder={placeholder}
                        value={value !== undefined && value !== null ? value : ''}
                        onChange={e => onChange(e.target.value === '' ? undefined : e.target.value)}
                    />
                </FormField>
            );
    }
};
