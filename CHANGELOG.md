# Changelog

## 3.18.0

- Promote the maintainer-accepted 3.18.0-beta.2 to a stable release. Runtime code and styles are unchanged from beta.2; this is a version/metadata/documentation transition, not an additional feature iteration.
- Include the P2–P4 settings transactions, independent drafts, ordered canonical output, image/canvas lifecycle fixes, safe DOM handling, keyboard-friendly galleries and compact responsive workbench delivered in the betas.
- Retain plugin/theme/recipe IDs, existing configuration and snapshots, optional note enhancements, original Markdown, desktop-only support and Obsidian 1.7.2 minimum. Preserve AGPL and early MIT provenance; QR placeholders remain pending.
- Preserve v3.15.0 as a rollback release. Maintainer acceptance is recorded separately from automated/native-host evidence; stable publication does not imply official-directory approval or untested-platform certification.

## 3.18.0-beta.2

- Place the theme-gallery icon, background, font and font size in one compact responsive group: a single row in wider panes and natural wrapping in narrow panes, without stretching dropdowns across the full toolbar.
- Rename Advanced Typesetting to More Tools and split it into Article Actions and Local Layout Enhancements. Retain all nine actions; expose the explanation on demand and show an enabled effect on the collapsed entry.
- Rename enhancement choices by actual effect (none, steps, checklist, introduction, quotation/conclusion, subheadings) while preserving all six persisted recipe IDs, formatting behavior and existing snapshots. Add full selection labels on hover.
- Add runtime and isolated native-host layout tests. This prerelease retains the prior formatting algorithms, persisted IDs and desktop-only support; no Marketing vault files, settings or notes are changed.

## 3.18.0-beta.1

- Complete the authorized P2–P4 refactor candidate, retaining plugin IDs, existing theme IDs, visibility preferences, extension fields and layout snapshots. Independent source checkpoints precede this integrated beta; no intermediate stable release is implied.
- Isolate all editor drafts, serialize settings persistence and publish changes only after successful saves. Rebuild the theme form with lazy grouped native controls and retain advanced CSS fields.
- Keep gallery keyboard focus during theme trials, preserve cancel rollback, and expose neutral About/Help with QR placeholders and truthful source attribution.
- Match repeated dialogue/gallery blocks by source position and content, prevent stale renders from replacing newer articles, and keep each preview pane's trial and header/footer state independent.
- Use one ordered canonical article for clipboard, HTML and image exports, including custom header/footer and manual preview edits; recipe switching restores underlying styles without duplicate labels.
- Add bounded, cached image embedding with visible HTTP/type/size/timeout errors. Serialize canvas jobs, exclude unrelated host UI/images from cloning, and clean up on timeout/cancellation.
- Move secondary controls into existing Advanced Typesetting and group output buttons compactly; preserve scene-based name-only theme cards and the small history entry. Add native-select, dark-mode and keyboard-focus fixes.
- Real Windows Obsidian 1.13.7 tests generated a complete 1012×13196px long image, ten segments, HTML and system clipboard content. Automated regression and host evidence are recorded in the execution ledger; WeChat/BRAT acceptance and other platforms remain gates before stable release.

## 3.15.1-beta.1

- P0/P1 refactor preview: preserve the 3.15.0 rollback baseline, source provenance, saved theme IDs and snapshots.
- Sanitize custom HTML before preview insertion, escape dialogue text, validate gallery resource URLs, and retain approved inline article typography with DOMPurify.
- Warn when unsafe legacy theme/background resource CSS is filtered; keep original saved configuration unchanged.
- Replace direct static style assignments with the supported host API and settings headings with native Setting headings.
- Fix nanoid advisories; add frozen full-lint debt reporting rather than claiming the legacy project is fully lint-clean.
- Fix the clipboard's removed pangu API call found by runtime tests; format text nodes synchronously, keep code literal, and derive plain text from the same cleaned article.
- Require Obsidian 1.7.2+, accept bare release tags while retaining old v-prefixed releases, and include the DOMPurify license.
- Add real DOM tests for all 19 themes, custom settings/snapshot round trips, unsafe inputs and Callout text. Manual Obsidian/BRAT and WeChat export acceptance remains required before stable release.

## 3.15.0

- Stable release of the curated WeChat theme gallery, mobile reading preview, and responsive plugin interface from the 3.15.0 beta series.
- Confirmed long-form, tutorial, and report paste results in the WeChat editor during acceptance; no feature changes since beta.4.

## 3.15.0-beta.4

- Refined the preview workbench, settings accordions, theme galleries and editor dialogs with consistent spacing and calmer visual hierarchy.
- Made the toolbar respond to the plugin pane width; compact and extra-narrow panes keep every action accessible without horizontal page overflow.
- Let both theme galleries fit short lists while retaining scrolling for long lists; improved narrow-window button layout and reduced-motion behavior.
- Kept themes, recipes, settings, Markdown, copy and export behavior unchanged.

## 3.15.0-beta.3

- Restored the theme-gallery control to an icon-only button, fixing clipped text in narrow Obsidian panes.
- Moved the 375px/adaptive choice next to the preview, showing the current mode and explaining when a narrow pane already matches phone width.
- Moved article recipes into collapsed Advanced Typesetting while preserving every saved recipe and its current rendering behavior.

## 3.15.0-beta.2

- Completed the seven-scene gallery with two structurally distinct featured themes per scene, while keeping all five legacy themes behind a small history button.
- Gave the preview toolbar separate, labelled appearance and typography rows so theme, recipe and font selections do not truncate at typical pane widths.
- Preserved all prior theme IDs, visibility preferences and layout snapshots; added five new theme IDs without changing Markdown or note themes.

## 3.15.0-beta.1

- Curated nine distinct WeChat themes; five former presets remain accessible as legacy themes without changing saved IDs or snapshots.
- Added three theme-specific reading rhythms, theme-aware recipe and component accents, and a 375px phone preview that does not affect export width.
- Added a mobile warning for tables wider than three columns and retained the original Markdown and Obsidian note themes.

## 3.14.0

- Stable release of the dual-layout Obsidian and WeChat publishing upgrade.
- Includes the completed reading view, Live Preview, source mode, theme gallery,
  lifecycle synchronization, compatibility boundaries, and rollback safeguards.

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
