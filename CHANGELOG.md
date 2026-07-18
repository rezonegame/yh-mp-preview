# Changelog

## 3.6.3

- Simplified every theme card to its name and recommended article use, removing
  visual previews and duplicated metadata from the selection list.

## 3.6.2

- Explicitly stack the preview and information regions of every theme card,
  preventing Obsidian theme button styles from forcing a horizontal layout.

## 3.6.1

- Default the theme gallery to the current theme's article scene, while keeping
  all themes available as an explicit exploration filter.
- Increase card width and clarify the in-card preview hierarchy so theme names
  remain legible in compact Obsidian workspaces.

## 3.6.0

- Reworked the Theme Gallery into a scene-first card picker inspired by article-use recommendations.
- A card click now previews a theme only; cancel restores the previous theme and Apply persists the selected theme.
- Kept article recipes outside the gallery so visual themes and article structure remain separate choices.

## 3.5.0

- Added ThemeManifest V3 validation, safe JSON import, and portable export for custom themes.
- Imported manifests now bridge into the existing custom-template renderer, validation gate, and layout history instead of creating a parallel rendering path.
- Added V2-to-V3 migration and ThemeManifest authoring documentation.

## 3.0.1

- Removed 30 historical `xiaohu` import themes and conversion scripts from the
  distribution pending upstream provenance review.

## 3.0.0

- Migrated the project license to AGPL-3.0-or-later while preserving the original MIT notice.
- Added ArticleModel, local LayoutPlan, ThemeManifest, legacy theme adapter and theme registry.
- Added non-destructive v2 settings migration metadata and a v3 copy preparation pipeline.
- Added a WeChat HTML compatibility validator that reports unsafe legacy structures during copy.
- Added third-party license notices and theme provenance references for the v3 distribution.

## 2.0.11

- Added reproducible version synchronization and release metadata checks.
- Added a Node-based test suite and four Markdown regression fixtures.
- Added reproducible theme provenance and WeChat compatibility baseline audits.
- Added strict UTF-8 validation for tracked text files.
- Updated the release workflow to run verification before publishing and to include the MIT license and notice.
- Added a project notice to preserve the upstream attribution path ahead of the v3 AGPL migration.

## 2.0.10

- Renamed the plugin package and BRAT repository path to yh-mp-preview.
