# Third-party notices

Updated: 2026-10-01. This describes the current 3.19.0 source tree in the
original repository. Published `3.18.0` and earlier releases keep their original assets.

## Early implementation, refactor, and retained portions

- [Yeban8090/mp-preview](https://github.com/Yeban8090/mp-preview), pinned at
  `49e77aabd62b7c01a812a10e457cf7a12e45199e`: MIT License,
  `Copyright (c) 2025 夜半Yeban`. Full text:
  [LICENSES/MIT-original.txt](LICENSES/MIT-original.txt).

The current product is independently maintained and follows its own product
direction. P2–P4 architecture work is complete, including settings transactions,
isolated drafts, canonical article output, resource handling, and rendering lifecycle.
Version 3.19.0 (developed as an unpublished 3.19.0-beta.1 candidate) additionally rebuilds the previously
identified background editor, forms, settings catalog, lock state, theme application
and seven stylesheets. The nanoid package forwarding file is removed. Current
comparison finds zero exact matches under the unchanged documented thresholds.
This is not a clean-room authorship proof; historical MIT attribution remains.
Exact scope, source hashes, implementation evidence and limitations are in
[SOURCE_PROVENANCE](docs/SOURCE_PROVENANCE.md) and the
[machine report](reports/source-provenance-audit.json).

These findings are provenance evidence, not an infringement verdict. Refactoring,
different product direction, and license attribution do not themselves establish
the public approval required by the official directory's fork policy.

## Runtime dependencies

| Package | Installed version | License / full text | Role |
| --- | --- | --- | --- |
| [html2canvas](https://github.com/niklasvh/html2canvas) | 1.4.1 | [MIT](LICENSES/html2canvas.txt) | Full-article and segmented image capture |
| [nanoid](https://github.com/ai/nanoid) | 5.1.16 | [MIT](LICENSES/nanoid.txt) | Local identifiers |
| [pangu](https://github.com/vinta/pangu.js) | 7.2.0 | [MIT](LICENSES/pangu.txt) | Chinese/Latin spacing |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.16 | [MPL-2.0 OR Apache-2.0](LICENSES/DOMPurify.txt) | HTML sanitization |

The v3 source and distribution are licensed under AGPL-3.0-or-later. These
dependency notices do not replace the licenses included with their packages.
DOMPurify is bundled without source modifications; its dual-license text is
included in [LICENSES/DOMPurify.txt](LICENSES/DOMPurify.txt). The MIT library
license texts were copied from the installed package versions, retaining their
copyright lines. html2canvas's bundled header additionally credits 2022 Niklas
von Hertzen; preserve that header as well as the package LICENSE's 2012 notice.

### Notices inside dependency distributions

- html2canvas's distributed JavaScript includes Microsoft helper code with an
  ISC-style permission notice: [LICENSES/Microsoft-helpers.txt](LICENSES/Microsoft-helpers.txt).
- DOMPurify's distributed JavaScript carries the Babel regenerator-runtime helper
  notice for Facebook, Inc. The linked upstream helper license also credits
  Sebastian McKenzie and other contributors; full text:
  [LICENSES/babel-helpers.txt](LICENSES/babel-helpers.txt), from the
  [upstream license referenced by that header](https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE).
  This is not a separately installed direct npm dependency, and no helper version
  is inferred from the DOMPurify version.
  License text verified against upstream Git blob
  `37b2c998c41e131cfdd18e93536c73cfaf919ed4` on 2026-10-01.

The existing esbuild legal-comment output is retained. Release preparation now
checks all five additional license files and ships them with future releases.
Host-provided Obsidian, Electron and CodeMirror APIs remain external to the bundle;
development tooling is not represented as shipped runtime code.

## Design and workflow research references

Earlier theme and UX research discussed the following repositories:
[gzh-design-skill](https://github.com/isjiamu/gzh-design-skill),
[WX-Typesetting](https://github.com/pwping/WX-Typesetting),
[doocs/md](https://github.com/doocs/md),
[huasheng_editor](https://github.com/alchaincyf/huasheng_editor),
[WeMD](https://github.com/tenngoxars/WeMD),
[raphael-publish](https://github.com/liuxiaopai-ai/raphael-publish), and
[markleaf](https://github.com/zhuanshunjishi2017/markleaf).
These are research references, not runtime dependencies or a blanket permission
to redistribute their code, theme files, screenshots, logos, or generated assets.
The Yeban comparison audit does not establish clearance against every external
repository. Any future direct import requires a pinned source, applicable license,
attribution and separate review before bundling.

## Personal contact and removed QR resources

The old `src/assets/donate.ts`, `src/assets/qrcode.ts`,
`src/assets/donate/alipay.png` and `src/assets/donate/wechat_pay.png` matched the
pinned early upstream. They had no current imports and are removed from the
current source tree, together with the old manager and text placeholders. Their
ownership is not inferred from the current maintainer name. Git history and
existing releases are preserved; no new payment or public-account QR is supplied.

The maintainer explicitly supplied the Akira personal WeChat image for the
Personal Contact dialog. It is stored at `src/assets/personal-wechat.png`,
940×1395, unchanged and embedded locally. SHA-256:
`187a47d31a962ca7c89b922f3d12a7e8c0ddf682b1ba11dddd06f62ebfaf38bf`.
No QR target is decoded or contacted. This is a maintainer-provided contact asset,
not inherited third-party payment media; platform marks are not claimed as
maintainer-owned software. The dialog has no article/export integration.

## Quarantined legacy themes

The 30 historical `xiaohu` import themes and their conversion scripts were
removed from the v3.0.1 distribution because their upstream provenance has not
been verified. They remain available only in the repository history until a
separate provenance review authorizes a compliant reintroduction.

These quarantined imports are distinct from the five selectable historical themes
in the current gallery. The theme audit verifies inventory, IDs and distribution
metadata, not authorship or permission through similarity checks alone.
