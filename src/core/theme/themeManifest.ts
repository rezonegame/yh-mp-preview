export interface DesignTokens {
    accent: string;
    text: string;
    mutedText: string;
    background: string;
    fontSize: string;
    lineHeight: string;
}

export interface ComponentDefinition {
    id: string;
    legacyStyle?: string;
}

export interface ArticleRecipe {
    id: string;
    name: string;
    componentIds: string[];
}

export interface ThemeManifest {
    schemaVersion: 3;
    id: string;
    name: string;
    version: string;
    license: string;
    source?: string;
    tokens: DesignTokens;
    components: ComponentDefinition[];
    recipes: ArticleRecipe[];
    compatibility: {
        mode: 'native' | 'legacy';
        notes: string[];
    };
}
