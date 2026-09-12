# Changelog

## 3.14.0-rc.1

- Release candidate for the dual-layout upgrade.
- No new feature scope after `3.14.0-beta.1`; this candidate focuses on stability,
  compatibility, rollback, and three-day real-use observation.

## 3.14.0-beta.1

- Synchronized note-layout overrides when notes are renamed, moved, or deleted.
- Reduced unnecessary Live Preview refresh work on selection-only updates.
- Added host compatibility and conservative rollback documentation.

## 3.13.0-beta.1

- Added shared theme framework metadata for WeChat and note-reading surfaces.
- Added portable surface, scene, framework, and recommendation metadata to V3 theme manifests.
- Kept note overrides in `note-layout.json` and WeChat selection in plugin settings.

## 3.12.0-beta.1

- Added a separate note-reading theme gallery with three curated note themes.
- Added try-before-apply, current-note override, vault default, and native-layout actions.
- Kept the existing WeChat gallery as a separate scene and preserved its selection pipeline.

## 3.11.0-beta.1

- Added scoped reading-view styles for lists, tasks, quotes, callouts, code,
  tables, images, and embeds.
- Added an optional source-mode display enhancement for headings, lists, quotes,
  emphasis, links, and code markers without changing Markdown content.

## 3.10.0-beta.2

- Fixed Live Preview becoming a narrow column when note-layout enhancement is enabled.
- Kept editor width native while retaining note font, line-height, and theme enhancements.

## 3.10.0-beta.1

- Added the first working Obsidian note-layout enhancement for reading view
  and Live Preview, initially supporting default, deep-reading, and minimal.
- Kept the enhancement scoped to Obsidian note surfaces and separate from
  WeChat preview styles and export snapshots.

## 3.9.0-beta.1

- Added an isolated, disabled-by-default note-layout settings file with
  versioned validation, verified writes, backups, and restore commands.
- Added the note-layout lifecycle boundary without changing document styling;
  visual enhancement remains scheduled for the next feature version.

## 3.8.3-beta.1

- Added prerelease-safe version checks for `package-lock.json` and GitHub
  Releases.
- Hardened long-image and segmented-image export around image loading, cleanup,
  progress reporting, and oversized full-canvas failures.

## 3.8.2

- Fixed long-image and segmented-image export to render a complete article
  snapshot instead of only the visible part of the scrollable preview pane.
- Segmented export now renders each 1:1.33 image directly from that complete
  snapshot, avoiding viewport cropping and an oversized intermediate canvas.

## 3.8.1

- Fixed repeated scene filters in the theme gallery when a scene contains two
  alternative themes. Each scene is now rendered once with both cards inside.

## 3.8.0

- Added one deliberately distinct, WeChat-safe alternative to each of the
  seven article-use frameworks. The gallery now contains 14 themes, organised
  as two options per scene rather than a flat collection of colour variants.
- Added deep-reading, clear-guide, product-review, red-white-editorial,
  data-blueprint, eastern-notes, and olive-journal frameworks.

## 3.7.0

- Consolidated the shipped theme catalogue from 64 presets to seven distinct
  WeChat reading frameworks. All remaining themes now appear directly under
  their article-use scenes; there is no classic-theme or re-enable setting.
- Rebuilt every retained framework with a complete, conservative inline style
  set for long-form WeChat reading, including the previously incomplete forest
  case-study theme.
- Removed colour-only, decorative, and low-readability bundled presets. Custom
  user themes remain untouched; removed preset selections safely fall back to
  the default framework after upgrade.

## 3.6.5

- Kept the scene-first theme picker, but curated its default catalogue around
  seven distinct long-form reading frameworks instead of colour-only variations.
- Moved non-core bundled palettes to the optional classic-theme collection;
  existing active themes remain visible after upgrade and can be re-enabled in
  plugin settings.
- Added a shared WeChat reading baseline for every theme: stable text rhythm,
  left-aligned section hierarchy, readable tables, wrapping code, and
  responsive images.
- Simplified article recipes to avoid gradients, absolute positioning, and
  multi-colour structural signals that are unreliable in WeChat articles.

## 3.6.4

- Reduced theme cards to theme names only; after a selection, its recommended
  article use is shown in the footer beside the safe trial guidance.

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
