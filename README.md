# yh-mp-preview

一个面向微信公众号排版的 Obsidian 插件，可以把当前 Markdown 笔记转换为适合公众号后台粘贴的富文本样式，并在 Obsidian 内完成预览、微调、复制和长图导出。

![version](https://img.shields.io/github/v/tag/rezonegame/yh-mp-preview?color=blue&label=version&style=flat) ![license](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)

## 最新版本

当前版本：`3.0.1`

### 核心能力

- **公众号预览与复制**：在 Obsidian 中实时预览公众号排版效果，一键复制到微信公众号后台。
- **主题模板库**：内置多套文章样式模板，覆盖极简、聚焦、精致、醒目、学术、报告、禅意、场景情绪等风格。
- **本地排版增强**：支持目录、步骤、检查清单、摘要卡、作者卡、关注引导、FAQ、时间线、对比表格等组件。
- **Obsidian Callout 兼容**：自动转换 Obsidian Callout，并保留适合公众号阅读的视觉层级。
- **图片与表格优化**：支持图片 alt 图注、图片画廊、移动端表格横向滚动。
- **中文排版优化**：基于 pangu.js 自动处理中英文间距，并支持智能引号转换。
- **长图导出**：可将预览内容导出为长图，方便在其他平台分发。
- **安全的本地工作流**：所有增强都只影响预览、复制和导出结果，不会改写原始 Markdown 文件。

### 2.0.10 更新

- 插件 ID、插件名、包名统一改为 `yh-mp-preview`。
- 作者和维护者信息统一改为 `yhwang`。
- README 更新为新版功能说明，并补充 BRAT 使用方式。
- 保持 `main.js`、`manifest.json`、`styles.css` 位于仓库根目录，方便 BRAT 直接安装。

### 2.0.11 更新

- 增加版本同步、发布元数据和发行标签校验，保证本地、构建产物和 Release 一致。
- 增加主题来源台账与微信公众号兼容性基线审计，为 v3 升级建立可重复的质量基线。
- 增加 Markdown 固定文章测试集，覆盖常规文章、代码、表格、图片、组件和 Callout。

### 3.0.0 更新

- 引入本地 ArticleModel、LayoutPlan、ThemeManifest 和旧主题适配层，为主题组件和文章配方提供稳定数据基础。
- 复制流程增加微信公众号兼容性报告；当前会提示风险，不会静默删除正文。
- 支持在工作台选择文章配方，现有 Markdown 仍是唯一内容源。
- 项目迁移至 AGPL-3.0-or-later，原 MIT 许可证、主题来源台账和第三方声明均保留在仓库中。

### 3.0.1 更新

- 移除 30 个来源未完成核验的历史导入主题和转换脚本；待上游许可证确认后再以合规主题包形式引入。

## 使用方式

在 Obsidian 中打开命令面板，执行 `打开 yh-mp-preview`，或点击左侧栏的预览图标打开插件面板。

常用流程：

1. 在左侧编辑 Markdown。
2. 打开 `yh-mp-preview` 预览面板。
3. 选择主题、字体、背景和排版增强选项。
4. 点击 `Pub 复制`，粘贴到微信公众号后台。
5. 如需跨平台分发，可导出长图。

## BRAT 安装

本仓库适合通过 Obsidian BRAT 安装。在线仓库已改名完成，在 BRAT 中添加：

```text
rezonegame/yh-mp-preview
```

如果你之后把仓库转移到其他 GitHub 账号或组织，请在 BRAT 中使用真实仓库地址：

```text
<owner>/yh-mp-preview
```

BRAT 会从仓库根目录读取 `manifest.json`、`main.js` 和 `styles.css`。

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

## 来源与致谢

本插件基于 [Yeban8090/mp-preview](https://github.com/Yeban8090/mp-preview) 原始版本进行深度开发和扩展，感谢原作者 **@Yeban8090** 的贡献。

当前版本由 **@yhwang** 维护。

## 许可证

本项目采用 AGPL-3.0-or-later。详情请查看 [LICENSE](LICENSE)、[NOTICE](NOTICE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
