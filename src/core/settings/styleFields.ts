export interface StyleField { path: string; value: string; set(value: string): void }
export function styleFields(value: unknown, prefix = ''): StyleField[] {
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    return Object.entries(record).flatMap(([key, item]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return typeof item === 'string' ? [{ path, value: item, set: (next: string) => { record[key] = next; } }]
            : styleFields(item, path);
    });
}
