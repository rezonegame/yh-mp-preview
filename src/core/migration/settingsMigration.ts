export interface V3SettingsMetadata {
    enabled: boolean;
    selectedRecipeId: string;
    migrationSource: 'v2';
    legacyTemplateId?: string;
}

export const V3_SETTINGS_SCHEMA_VERSION = 3;

/**
 * Non-destructive v2 to v3 settings bridge. Existing fields remain untouched;
 * the alpha only adds metadata required by the new pipeline.
 */
export function migrateSettingsForV3(savedData: Record<string, any>): Record<string, any> {
    const existingV3 = savedData.v3 || {};
    const legacyTemplateId = typeof existingV3.legacyTemplateId === 'string'
        ? existingV3.legacyTemplateId
        : undefined;
    return {
        ...savedData,
        schemaVersion: Math.max(Number(savedData.schemaVersion) || 0, V3_SETTINGS_SCHEMA_VERSION),
        v3: {
            enabled: existingV3.enabled === true,
            selectedRecipeId: existingV3.selectedRecipeId || 'legacy-compatible',
            migrationSource: 'v2',
            ...(legacyTemplateId ? { legacyTemplateId } : {}),
        } as V3SettingsMetadata,
    };
}
