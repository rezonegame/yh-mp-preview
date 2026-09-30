export function cloneSettings<T>(value: T): T { return structuredClone(value); }

/** Detached reads, serialized writes, commit only after persistence succeeds. */
export class SettingsRepository<T> {
    private state: T;
    private tail: Promise<unknown> = Promise.resolve();
    constructor(initial: T, private persist: (value: T) => Promise<void>) { this.state = cloneSettings(initial); }
    read(): T { return cloneSettings(this.state); }
    initialize(value: T): void { this.state = cloneSettings(value); }
    update<R>(edit: (draft: T) => R): Promise<R> {
        const task = this.tail.then(async () => {
            const draft = this.read();
            const result = edit(draft);
            await this.persist(cloneSettings(draft));
            this.state = cloneSettings(draft);
            return result;
        });
        this.tail = task.catch(() => undefined);
        return task;
    }
}
