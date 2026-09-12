import { DataAdapter, normalizePath } from 'obsidian';

export const NOTE_LAYOUT_SCHEMA_VERSION = 1;
export const NOTE_LAYOUT_FILE_NAME = 'note-layout.json';
export const NOTE_LAYOUT_BACKUP_DIR = 'backups';

export interface NoteLayoutProfile {
    themeId: string;
    fontSize: number;
    lineHeight: number;
    maxWidth: number;
}

export type NoteLayoutFileOverride =
    | { mode: 'native' }
    | { mode: 'custom'; profile: NoteLayoutProfile };

export interface NoteLayoutSettingsV1 {
    schemaVersion: 1;
    enabled: boolean;
    sourceModeEnabled: boolean;
    defaults: NoteLayoutProfile;
    files: Record<string, NoteLayoutFileOverride>;
}

export interface NoteLayoutBackup {
    path: string;
    createdAt: string;
    reason: string;
    checksum: string;
}

const SUPPORTED_NOTE_THEMES = new Set(['default', 'deep-reading', 'minimal']);

export function createDefaultNoteLayoutSettings(): NoteLayoutSettingsV1 {
    return {
        schemaVersion: NOTE_LAYOUT_SCHEMA_VERSION,
        enabled: false,
        sourceModeEnabled: false,
        defaults: {
            themeId: 'default',
            fontSize: 16,
            lineHeight: 1.75,
            maxWidth: 760,
        },
        files: {},
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
    const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, number));
}

function normalizeProfile(value: unknown, fallback: NoteLayoutProfile): NoteLayoutProfile {
    const source = isRecord(value) ? value : {};
    return {
        themeId: typeof source.themeId === 'string' && source.themeId.trim() ? source.themeId : fallback.themeId,
        fontSize: Math.round(numberInRange(source.fontSize, 14, 24, fallback.fontSize)),
        lineHeight: Number(numberInRange(source.lineHeight, 1.4, 2.2, fallback.lineHeight).toFixed(2)),
        maxWidth: Math.round(numberInRange(source.maxWidth, 560, 960, fallback.maxWidth) / 20) * 20,
    };
}

export function normalizeNoteLayoutSettings(value: unknown): NoteLayoutSettingsV1 {
    if (!isRecord(value)) throw new Error('笔记排版设置不是有效对象');
    const schemaVersion = Number(value.schemaVersion);
    if (schemaVersion > NOTE_LAYOUT_SCHEMA_VERSION) {
        throw new Error(`笔记排版设置版本 ${schemaVersion} 高于当前支持版本`);
    }
    const defaults = createDefaultNoteLayoutSettings();
    const sourceDefaults = isRecord(value.defaults) ? value.defaults : {};
    const files: Record<string, NoteLayoutFileOverride> = {};
    if (isRecord(value.files)) {
        Object.entries(value.files).forEach(([path, override]) => {
            if (!path || !isRecord(override)) return;
            if (override.mode === 'native') {
                files[path] = { mode: 'native' };
            } else if (override.mode === 'custom') {
                files[path] = {
                    mode: 'custom',
                    profile: normalizeProfile(override.profile, defaults.defaults),
                };
            }
        });
    }
    return {
        schemaVersion: NOTE_LAYOUT_SCHEMA_VERSION,
        enabled: value.enabled === true,
        sourceModeEnabled: value.sourceModeEnabled === true,
        defaults: normalizeProfile(sourceDefaults, defaults.defaults),
        files,
    };
}

function safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'manual';
}

async function sha256(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export class NoteLayoutStore {
    private settings = createDefaultNoteLayoutSettings();
    private loaded = false;
    private available = true;
    private readonly filePath: string;
    private readonly backupDir: string;

    constructor(private readonly adapter: DataAdapter, pluginDir: string) {
        const directory = normalizePath(pluginDir || '.obsidian/plugins/yh-mp-preview');
        this.filePath = normalizePath(`${directory}/${NOTE_LAYOUT_FILE_NAME}`);
        this.backupDir = normalizePath(`${directory}/${NOTE_LAYOUT_BACKUP_DIR}`);
    }

    async load(): Promise<void> {
        this.loaded = true;
        this.available = true;
        if (!await this.adapter.exists(this.filePath)) return;
        try {
            const raw = await this.adapter.read(this.filePath);
            this.settings = normalizeNoteLayoutSettings(JSON.parse(raw));
        } catch (error) {
            this.available = false;
            throw new Error(`笔记排版设置读取失败：${error instanceof Error ? error.message : '文件损坏'}`);
        }
    }

    isAvailable(): boolean {
        return this.loaded && this.available;
    }

    getSettings(): NoteLayoutSettingsV1 {
        return JSON.parse(JSON.stringify(this.settings)) as NoteLayoutSettingsV1;
    }

    getProfileForPath(path: string): NoteLayoutProfile | null {
        if (!this.settings.enabled) return null;
        const override = this.settings.files[normalizePath(path)];
        if (override?.mode === 'native') return null;
        const profile = override?.mode === 'custom' ? override.profile : this.settings.defaults;
        return {
            ...profile,
            themeId: SUPPORTED_NOTE_THEMES.has(profile.themeId) ? profile.themeId : 'default',
        };
    }

    isSourceModeEnabledForPath(path: string): boolean {
        if (!this.settings.enabled || !this.settings.sourceModeEnabled) return false;
        return this.settings.files[normalizePath(path)]?.mode !== 'native';
    }

    async setDefaultProfile(profile: NoteLayoutProfile): Promise<void> {
        await this.updateSettings({ defaults: profile });
    }

    async setFileOverride(path: string, override: NoteLayoutFileOverride): Promise<void> {
        const files = { ...this.settings.files, [normalizePath(path)]: override };
        await this.updateSettings({ files });
    }

    async moveFileOverride(oldPath: string, newPath: string): Promise<boolean> {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        const override = this.settings.files[normalizedOldPath];
        if (!override || normalizedOldPath === normalizedNewPath) return false;
        const files = { ...this.settings.files };
        delete files[normalizedOldPath];
        files[normalizedNewPath] = override;
        await this.updateSettings({ files });
        return true;
    }

    async removeFileOverride(path: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        if (!this.settings.files[normalizedPath]) return false;
        const files = { ...this.settings.files };
        delete files[normalizedPath];
        await this.updateSettings({ files });
        return true;
    }

    async updateSettings(patch: Partial<NoteLayoutSettingsV1>): Promise<void> {
        await this.save({ ...this.getSettings(), ...patch });
    }

    async save(value: NoteLayoutSettingsV1): Promise<void> {
        if (!this.isAvailable()) throw new Error('笔记排版设置当前不可用');
        const next = normalizeNoteLayoutSettings(value);
        const serialized = `${JSON.stringify(next, null, 2)}\n`;
        const previous = await this.adapter.exists(this.filePath) ? await this.adapter.read(this.filePath) : null;
        if (previous !== null) await this.createBackupFromRaw(previous, 'before-save');
        await this.writeAtomically(serialized, previous);
        this.settings = next;
    }

    async createBackup(reason = 'manual'): Promise<NoteLayoutBackup | null> {
        if (!await this.adapter.exists(this.filePath)) return null;
        return this.createBackupFromRaw(await this.adapter.read(this.filePath), reason);
    }

    async listBackups(): Promise<NoteLayoutBackup[]> {
        if (!await this.adapter.exists(this.backupDir)) return [];
        const listed = await this.adapter.list(this.backupDir);
        const backups: NoteLayoutBackup[] = [];
        for (const path of listed.files.filter(item => item.endsWith('.json'))) {
            try {
                const raw = await this.adapter.read(path);
                const parsed = JSON.parse(raw) as NoteLayoutBackup & { settings?: unknown };
                if (parsed.settings) normalizeNoteLayoutSettings(parsed.settings);
                backups.push({ path, createdAt: parsed.createdAt, reason: parsed.reason, checksum: parsed.checksum });
            } catch (_) {
                // Ignore incomplete or manually removed backup files.
            }
        }
        return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    async restoreLatestBackup(): Promise<NoteLayoutBackup | null> {
        const latest = (await this.listBackups())[0];
        if (!latest) return null;
        const raw = await this.adapter.read(latest.path);
        const parsed = JSON.parse(raw) as { settings?: unknown };
        const restored = normalizeNoteLayoutSettings(parsed.settings);
        await this.save(restored);
        return latest;
    }

    private async createBackupFromRaw(raw: string, reason: string): Promise<NoteLayoutBackup> {
        const settings = normalizeNoteLayoutSettings(JSON.parse(raw));
        const checksum = await sha256(raw);
        await this.ensureBackupDirectory();
        const createdAt = new Date().toISOString();
        const isFirst = (await this.listBackups()).length === 0;
        const name = `${isFirst ? 'baseline' : safeName(reason)}-${createdAt.replace(/[:.]/g, '-')}-${checksum.slice(0, 8)}.json`;
        const path = normalizePath(`${this.backupDir}/${name}`);
        const payload = `${JSON.stringify({ createdAt, reason, checksum, settings }, null, 2)}\n`;
        await this.adapter.write(path, payload);
        if (await this.adapter.read(path) !== payload) throw new Error('笔记排版备份校验失败');
        await this.pruneBackups();
        return { path, createdAt, reason, checksum };
    }

    private async writeAtomically(serialized: string, previous: string | null): Promise<void> {
        const temporaryPath = `${this.filePath}.tmp-${Date.now()}`;
        try {
            await this.adapter.write(temporaryPath, serialized);
            if (await this.adapter.read(temporaryPath) !== serialized) throw new Error('临时文件读回校验失败');
            if (await this.adapter.exists(this.filePath)) await this.adapter.remove(this.filePath);
            await this.adapter.rename(temporaryPath, this.filePath);
            if (await this.adapter.read(this.filePath) !== serialized) throw new Error('设置文件读回校验失败');
        } catch (error) {
            if (await this.adapter.exists(temporaryPath)) await this.adapter.remove(temporaryPath);
            if (previous !== null && !await this.adapter.exists(this.filePath)) await this.adapter.write(this.filePath, previous);
            throw error;
        }
    }

    private async ensureBackupDirectory(): Promise<void> {
        if (!await this.adapter.exists(this.backupDir)) await this.adapter.mkdir(this.backupDir);
    }

    private async pruneBackups(): Promise<void> {
        const backups = await this.listBackups();
        const baseline = backups.filter(item => item.path.includes('/baseline-'));
        const recent = backups.filter(item => !item.path.includes('/baseline-')).slice(0, 10);
        const keep = new Set([...baseline, ...recent].map(item => item.path));
        for (const backup of backups) {
            if (!keep.has(backup.path)) await this.adapter.remove(backup.path);
        }
    }
}
