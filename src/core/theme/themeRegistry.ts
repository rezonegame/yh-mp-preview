import type { ThemeManifest } from './themeManifest';

export class ThemeRegistry {
    private readonly themes = new Map<string, ThemeManifest>();

    replaceAll(themes: ThemeManifest[]): void {
        this.themes.clear();
        themes.forEach((theme) => this.register(theme));
    }

    register(theme: ThemeManifest): void {
        this.themes.set(theme.id, theme);
    }

    get(id: string): ThemeManifest | undefined {
        return this.themes.get(id);
    }

    list(): ThemeManifest[] {
        return Array.from(this.themes.values());
    }
}
