# yh-mp-preview

一个独立维护、持续演进的 Obsidian 排版工具，同时提供微信公众号排版工作台和可选的笔记阅读／编辑视图增强。公众号工作台可将 Markdown 转换为适合公众号后台粘贴的富文本，在本地完成预览、微调、复制和图片导出；笔记增强不改写 Markdown 原文。

An independently maintained Markdown typesetting workbench for Obsidian: WeChat Official Account formatting, rich-text copying, image export, and optional note layout enhancements. Historical releases used MIT-licensed upstream implementation. The current rebuild and its provenance limits are documented below. No account, payment, AI service, or automatic publishing is required.

## English overview

Prepare WeChat Official Account articles without leaving your vault. The workbench provides 14 curated themes across seven writing scenarios, five recoverable historical themes, font and background controls, phone-width preview, and optional local layout effects. Copy the finished article as rich text, or export HTML, a complete long image, or segmented images. The plugin does not automatically publish articles.

Optional note-layout enhancements have separate settings and are disabled by default. Preview formatting does not rewrite Markdown. Editing an image caption is a separate, explicit action that updates the corresponding source text. Custom themes, hidden-theme preferences and typesetting snapshots remain supported.

The plugin is free and desktop-only. It requires Obsidian 1.7.2 or later; this release was tested on Windows with Obsidian 1.13.7. Other platforms and older supported hosts were not tested in this round. There is no telemetry, payment requirement, account requirement or AI service. Referenced remote images may be requested from their original hosts during rendering, copying or export. No article text is uploaded to a maintainer-operated server.

Version 3.19.0 rebuilds the remaining implementations identified by the source audit and embeds the maintainer-supplied personal-contact QR image offline. It continues in the original repository with the same plugin ID and BRAT address; previous releases remain available. Historical MIT attribution and dependency licenses are preserved. Exact-match checks are not proof of independent authorship or official-directory approval.

Install the published plugin through BRAT using `rezonegame/yh-mp-preview`. It is not yet listed in the official Community directory. Open the preview from the ribbon or command palette, choose a layout, and use the copy or export controls. See [source provenance](docs/SOURCE_PROVENANCE.md), [license notices](THIRD_PARTY_NOTICES.md), and [submission status](docs/COMMUNITY_SUBMISSION.md).

![version](https://img.shields.io/github/v/tag/rezonegame/yh-mp-preview?color=blue&label=version&style=flat) ![license](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)

## 最新版本

当前发行版本：`3.19.0`。回退版本保留 `3.18.0` 和 `v3.15.0`。

`3.19.0` 在 P2–P4 基础上重建剩余背景／字体表单、设置合并、预览锁定、主题应用和样式基础，加入维护者个人二维码，并修复非默认配置目录的笔记增强存储。需要 Obsidian **1.7.2 或更新版本**，仅支持桌面；从原有 BRAT 地址更新即可，若固定了旧版，可选择 `3.19.0`。不更改插件 ID、配置格式或 Markdown 原文，详见[实施与验收台账](docs/REFACTOR_EXECUTION.md)。

### 核心能力

- **公众号预览与复制**：在 Obsidian 中实时预览公众号排版效果，一键复制到微信公众号后台。
- **公众号主题画廊**：14 套精选主题按 7 种文章场景归类，每个场景两套明显不同的版式；另有可找回的历史主题。
- **手机阅读预览**：在公众号面板切换自适应与 375px 手机宽度，切换不写入笔记，也不改变复制和图片导出宽度。
- **更多工具与局部增强**：文章操作和局部排版增强分组呈现，默认收起；增强选项按实际效果命名，旧稿中已选择的效果继续生效，主题仍负责整体视觉。
- **本地排版增强**：支持目录、步骤、检查清单、摘要卡、作者卡、关注引导、FAQ、时间线、对比表格等组件。
- **Obsidian Callout 兼容**：自动转换 Obsidian Callout，并保留适合公众号阅读的视觉层级。
- **图片与表格优化**：支持图片 alt 图注、图片画廊、移动端表格横向滚动。
- **中文排版优化**：基于 pangu.js 自动处理中英文间距，并支持智能引号转换。
- **长图导出**：可将预览内容导出为长图，方便在其他平台分发。
- **安全的本地工作流**：所有增强都只影响预览、复制和导出结果，不会改写原始 Markdown 文件。

3.15 保留原有 14 个主题 ID、已有主题选择与排版快照，并新增 5 套主题。旧主题通过画廊右上角的小按钮找回，不会自动替换；超过三列的表格会给出手机阅读提示，但不会自动改写表格。长文、教程和报告的公众号后台粘贴效果已通过验收。

完整版本历史见 [CHANGELOG](CHANGELOG.md)。开发阶段的 `3.19.0-beta.1` 未公开发行，本次直接以数字版本 `3.19.0` 在原仓库继续发布。历史标签、发行资产和 Git 历史不覆盖；不创建新仓库或迁移安装路径。

## 使用方式

在 Obsidian 中打开命令面板，执行 `打开 yh-mp-preview`，或点击左侧栏的预览图标打开插件面板。

常用流程：

1. 在左侧编辑 Markdown。
2. 打开 `yh-mp-preview` 预览面板。
3. 选择主题、字体、背景和排版增强选项。
4. 点击 `Pub 复制`，粘贴到微信公众号后台。
5. 如需跨平台分发，可导出长图。

## BRAT 安装

目前请通过 Obsidian BRAT 安装，在 BRAT 中添加：

```text
rezonegame/yh-mp-preview
```

发行文件为 `main.js`、`manifest.json` 和 `styles.css`；如固定了预发布版本，可切换到 `3.19.0`。本插件尚未正式上架 Obsidian 官方社区目录，不应把 BRAT 可安装或本地测试通过理解为官方审核通过。

## 组件示例

````markdown
```toc
01 | 先看问题 | 为什么公众号文章需要阅读导航
02 | 再看方法 | 如何用组件增强排版
03 | 最后发布 | 复制到公众号后台检查效果
```

```steps
01 | 写好正文 | 先完成内容
02 | 添加组件 | 用本地排版块强化阅读路径
03 | 复制发布 | 粘贴到公众号后台继续微调
```

```author-card
name: yhwang
title: 写作与效率工具实践
bio: 专注于 Obsidian、公众号排版和内容工作流。
```
````

## 当前架构与重构范围

当前产品由 **@yhwang** 独立维护，产品方向、主题整理和后续升级由本项目负责。`3.18.0` 已完成 P2–P4 计划的配置事务与独立草稿、规范文章输出、图片资源服务、渲染生命周期、工作台及表单交互重构。公众号输出与笔记增强分别设置，Markdown 仍是内容源。具体实现与验收证据见 [实施台账](docs/REFACTOR_EXECUTION.md)。

完成这些架构重构不等于所有代码均为无继承的独立实现，也不意味着原作者批准了本项目上架。以下声明依据当前代码核验，不再以重构前的旧文件清单作为现状。

## 来源、素材与致谢

早期项目采用了 [Yeban8090/mp-preview](https://github.com/Yeban8090/mp-preview) 的 MIT 许可实现。感谢原作者 **@Yeban8090**；原版权声明 `Copyright (c) 2025 夜半Yeban` 与完整许可保存在 [LICENSES/MIT-original.txt](LICENSES/MIT-original.txt)。本项目不是上游的官方版本，独立维护不表示没有继承代码。

2026-10-01 在 P2–P4 基础上继续重建背景图案与编辑器、字体／确认表单、设置目录与分组、预览锁定、主题应用器及七份样式基础，删除 nanoid 单行转发。当前 95 个源码文件在固定上游、相同阈值下的整文件、方法体、长 token 片段和合格 CSS 规则完全匹配均为 0。这不等于 clean-room 独立创作证明或官方批准，历史 MIT 来源与版权继续保留。实现清单、限制、全部哈希和复现步骤见 [来源核验说明](docs/SOURCE_PROVENANCE.md) 与 [机器报告](reports/source-provenance-audit.json)。

旧打赏／公众号二维码、管理器与文字占位已从当前源码移除。“个人联系”仅展示维护者提供的 Akira 微信二维码，原图原样内嵌，无网络请求，不加入文章或导出内容。旧资源只保留在 Git 历史和既有发行版本中。30 套来源未核实的历史 `xiaohu` 导入主题及转换脚本仍不随当前发行分发；它们与画廊中可找回的 5 套本项目历史主题不是同一批内容。

主题研究参考、运行依赖及依赖内嵌辅助代码分别记录在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。19 套当前内置主题的文件清单见 [主题审计](reports/theme-audit.json)；该清单检查发行范围和 ID，不替代逐项版权／授权结论。

Version 3.19.0 rebuilds the previously identified implementation and stylesheet fragments in the original repository. No exact matches remain under the documented audit thresholds; this is not proof of independent authorship or official approval. Historical MIT attribution and dependency licenses remain intact. Personal Contact embeds the maintainer-provided QR image unchanged and offline, without donations, public-account promotion or article insertion. Official-directory review remains a separate process.

## 网络与隐私

排版、主题应用、笔记增强和图片导出在本地执行，无需注册、付费或 AI 服务，不提供自动发布，也不包含遥测。文章中的远程图片可能由 Obsidian 渲染时加载；复制或导出时，插件会尝试从图片原地址读取图片并转为内嵌数据。这会向文章所引用的图片服务器发出请求，但不向本插件维护者的服务器上传正文。

Typesetting and note enhancements run locally. The plugin has no telemetry or automatic publishing and requires no account, payment, or AI service. Rendering may load remote images referenced by the article; copying or exporting attempts to fetch those images from their original URLs to embed them. Those requests go to the article's image hosts, not to a server operated by this plugin's maintainer.

## 许可证

本项目由维护者提供的现行代码采用 AGPL-3.0-or-later；保留的上游实现及第三方依赖继续遵守各自许可，不把它们重新声明为维护者独占版权。详情见 [LICENSE](LICENSE)、[NOTICE](NOTICE)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [LICENSES](LICENSES/)。

来源署名和开源许可不等同于 Obsidian 官方目录的上架同意。维护者已确认继续原仓库／插件 ID，不采用新仓库路径；历史来源资格仍需独立核验，正式列表仍为草稿。各版本的发行与官方扫描状态见 [官方提交记录](docs/COMMUNITY_SUBMISSION.md)。
