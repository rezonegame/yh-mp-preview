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
export function migrateSettingsForV3(savedData: Record<string, unknown>): Record<string, unknown> {
    const existingV3 = savedData.v3 && typeof savedData.v3 === 'object' ? savedData.v3 as Record<string, unknown> : {};
    const legacyTemplateId = typeof existingV3.legacyTemplateId === 'string'
        ? existingV3.legacyTemplateId
        : undefined;
    return {
        ...savedData,
        schemaVersion: Math.max(Number(savedData.schemaVersion) || 0, V3_SETTINGS_SCHEMA_VERSION),
        v3: {
            ...existingV3,
            enabled: existingV3.enabled === true,
            selectedRecipeId: typeof existingV3.selectedRecipeId === 'string' ? existingV3.selectedRecipeId : 'legacy-compatible',
            migrationSource: 'v2',
            ...(legacyTemplateId ? { legacyTemplateId } : {}),
        },
    };
}
