/**
 * useField / useArrayField — generic leaf-level binding on top of
 * useXrayEditor().updateField (immer-based, path-addressed).
 *
 * The problem these solve: today most editors hand-roll
 * `value={x} onChange={e => onChange(['settings','password'], e.target.value)}`
 * inline in JSX, so the markup node and its store binding are the same
 * line — rewriting the visual layout risks breaking the wiring. Wrapping
 * that pair in `field.value` / `field.onChange` means the binding lives in
 * one place (the path passed to useField) and the JSX only ever consumes
 * `{...field}` — restyle freely, the binding doesn't move.
 *
 * These are plain functions, not React hooks with their own state — they
 * read from and dispatch through whatever `local`/`updateField` the caller
 * already has from useXrayEditor. The `use` prefix is kept for convention
 * (call-site symmetry with other field hooks), not because of hook rules.
 */

export type FieldPath = string | (string | number)[];

function getAtPath(obj: any, path: FieldPath): any {
    if (obj == null) return undefined;
    if (!Array.isArray(path)) return obj[path];
    let curr = obj;
    for (const key of path) {
        if (curr == null) return undefined;
        curr = curr[key];
    }
    return curr;
}

function pathToErrorKey(path: FieldPath): string {
    return Array.isArray(path) ? path.join('.') : path;
}

export interface FieldBinding<T = any> {
    value: T;
    onChange: (value: T) => void;
    error?: string;
}

/**
 * Bind a single leaf field to a config path.
 *
 * const password = useField<string>(local, updateField, ['settings', 'password'], getError);
 * <Input value={password.value ?? ''} onChange={e => password.onChange(e.target.value)} error={password.error} />
 */
export function useField<T = any>(
    local: any,
    updateField: (path: FieldPath, value: any) => void,
    path: FieldPath,
    getError?: (field: string) => string | undefined
): FieldBinding<T> {
    return {
        value: getAtPath(local, path),
        onChange: (next: T) => updateField(path, next),
        error: getError ? getError(pathToErrorKey(path)) : undefined,
    };
}

export interface ArrayFieldBinding<T = any> {
    items: T[];
    add: (item: T) => void;
    update: (index: number, patch: Partial<T>) => void;
    replace: (index: number, item: T) => void;
    remove: (index: number) => void;
    move: (fromIndex: number, toIndex: number) => void;
}

/**
 * Bind an array-of-objects field (clients, DNS servers, users, ...) to a
 * config path, replacing the hand-rolled add/update/remove closures that
 * were previously copy-pasted per editor (see InboundClients.tsx history).
 *
 * const clients = useArrayField<VlessClient>(local, updateField, ['settings', 'clients']);
 * clients.items.map((c, i) => <Row key={i} client={c} onChange={p => clients.update(i, p)} onRemove={() => clients.remove(i)} />)
 */
export function useArrayField<T = any>(
    local: any,
    updateField: (path: FieldPath, value: any) => void,
    path: FieldPath
): ArrayFieldBinding<T> {
    const items: T[] = getAtPath(local, path) || [];

    return {
        items,
        add: (item: T) => updateField(path, [...items, item]),
        update: (index: number, patch: Partial<T>) => {
            const next = items.slice();
            next[index] = { ...(next[index] as any), ...patch };
            updateField(path, next);
        },
        replace: (index: number, item: T) => {
            const next = items.slice();
            next[index] = item;
            updateField(path, next);
        },
        remove: (index: number) => {
            const next = items.slice();
            next.splice(index, 1);
            updateField(path, next);
        },
        move: (fromIndex: number, toIndex: number) => {
            if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
            const next = items.slice();
            const [moved] = next.splice(fromIndex, 1);
            if (moved === undefined) return; // fromIndex was out of range
            next.splice(toIndex, 0, moved);
            updateField(path, next);
        },
    };
}
