# 公众号主题体验：第二轮研究与证据

日期：2026-10-02。范围：MP Preview 3.19.1 与用户指定的四个项目；面向在 Obsidian 桌面内排版、手动复制至公众号的作者。研究用于下一轮渐进升级，不用于重做整个插件或扩大到发布、AI、图床。

## 1. 研究边界与方法

- 第一轮已查看四个在线演示的默认文章、样式菜单和主题选择窗口，并保存截图；本轮继续核对源码、公开问题与评论、当前插件的数据和输出契约。
- 外部源码只读，不安装、不运行、不复制进插件。公开问题是风险样本，不是总体故障率，也不能说明对方当前版本仍存在同一故障。
- 检索 GitHub issues 接口的最近 100 条记录（包含 PR），只选择与主题、字体、表格、复制和预览相关的 issue；没有匹配记录不代表没有问题。普通搜索对两个小项目信号较弱，因此不作用户规模或故障频率推断。
- 本轮没有再次操作公众号后台，没有提交或发布文章，没有验证任何新的插件排版效果。现有测试仅用于确认 3.19.1 的起点。
- 研究基线：本地 `205d7ad936c3453215f1e47bf1bf78c043749b67`；稳定发行的功能基线为 `834e87e77fead70e7819c807cc1cee45837d1b86` / 3.19.1。
- 本轮实际执行 `npm test`：Node 24.12.0，131 项通过、0 失败、0 跳过，约 31 秒。本轮没有重跑完整 build / verify 或真实宿主回归；此前记录不能冒充本轮执行结果。

## 2. 固定外部研究版本

| 项目 | 分支与研究提交 | 主要阅读模块 |
| --- | --- | --- |
| doocs/md | main · `a7c17fc4cda92e3c13aa7e24f06615cfa4219b31` | style/theme 配置、theme store、样式菜单、CSS 变量、主题应用、clipboard-dom |
| tenngoxars/WeMD | main · `70835e141aa94c0296c78c0f6adf67f636475f38` | 内置主题目录、主题面板、ThemeLivePreview、ThemeProcessor、复制归一化、表格布局、暗色转换 |
| Health-525/wechat-article-formatter | main · `0cf5d50aa7a0c3e03d624fe521f0cec7f4ab1ab2` | README、ThemeDropdown、markdownParser、gzhDesign/shared、橄榄与石墨渲染器 |
| mspringjade/wechat-formatter | master · `5d84e5004aef2395bb1626fd731cd7beb4ca6db3` | README、模板引擎、格式参数、设置面板、复制 hook、许可证文本 |

用户提供的第三个地址是 [墨排在线页](https://health-525.github.io/wechat-article-formatter/)，其源码仓库是 [Health-525/wechat-article-formatter](https://github.com/Health-525/wechat-article-formatter)。源码与线上部署不能未经核验便认为逐字一致。

## 3. 外部证据与取舍

### 3.1 doocs：主题与参数分层，比主题数量更重要

内置主框架为经典、优雅、简洁。版式与字体、字号、主题色、行距、段间距、引用背景、代码主题分开；按主题保存参数。`blockSpacing` 是主题垂直间距的倍率，而不是给每类节点套同一个距离。引用背景为默认时不强行统一灰底。

证据：[主题目录](https://github.com/doocs/md/blob/a7c17fc4cda92e3c13aa7e24f06615cfa4219b31/packages/shared/src/configs/theme.ts)、[参数定义](https://github.com/doocs/md/blob/a7c17fc4cda92e3c13aa7e24f06615cfa4219b31/packages/shared/src/configs/style.ts)、[变量与间距机制](https://github.com/doocs/md/blob/a7c17fc4cda92e3c13aa7e24f06615cfa4219b31/packages/core/src/theme/cssVariables.ts)、[主题状态](https://github.com/doocs/md/blob/a7c17fc4cda92e3c13aa7e24f06615cfa4219b31/apps/web/src/stores/theme.ts)。

判断：吸收少量精选框架、按比例调节和独立配色。不要照搬庞大的代码配色列表、远程样式资源和所有细节控件。当前插件的字体、字号、手机宽度已经存在，不能当成新功能重复建设；字体和字号继续保持现有全局选择，不因换主题突然改变。

### 3.2 WeMD：共享预览比逐卡缩略图有效

主题窗口内有一个共享预览，可选择当前文章或示例；使用 iframe 隔离展示样式，保留滚动位置、避免无关文章订阅。目录还保留不可选旧项，而不是强删所有旧主题。表格处理已改为保留主题字号和颜色，只统一部分布局参数。

证据：[共享预览](https://github.com/tenngoxars/WeMD/blob/70835e141aa94c0296c78c0f6adf67f636475f38/apps/web/src/components/Theme/ThemeLivePreview.tsx)、[选择窗口](https://github.com/tenngoxars/WeMD/blob/70835e141aa94c0296c78c0f6adf67f636475f38/apps/web/src/components/Theme/ThemePanelView.tsx)、[表格处理](https://github.com/tenngoxars/WeMD/blob/70835e141aa94c0296c78c0f6adf67f636475f38/apps/web/src/services/wechatTableRenderer.ts)。

判断：借鉴共享文章预览、示例切换和按主题保留元素特征。不要搬入右侧 CSS 编辑器或整套设计器。MP Preview 采用现有规范化文章 DOM，不新增 Markdown 解析器；隔离展示优先使用仅用于展示的 Shadow DOM，具体约束见升级方案。暗色转换是模拟算法，不能承诺真实微信效果，本轮暂缓。

### 3.3 墨排：章节组织值得学，重解释正文不值得学

选择器是按分类展开的名称列表；21 个可选主题中，9 个使用 gzhDesign 的独立组件渲染。共享模型包含 intro/chapter/outro、封面、章节标题、引用和图片卡片。

证据：[名称选择器](https://github.com/Health-525/wechat-article-formatter/blob/0cf5d50aa7a0c3e03d624fe521f0cec7f4ab1ab2/src/components/workspace/ThemeDropdown.tsx)、[结构模型](https://github.com/Health-525/wechat-article-formatter/blob/0cf5d50aa7a0c3e03d624fe521f0cec7f4ab1ab2/src/utils/gzhDesign/shared.ts)。

源码中的共享 `parseBlocks` 将列表项统一拼成圆点文本，未独立处理表格；封面提取会将正文首段当作副标题。不能以这些简化方式替代 Obsidian 渲染结果，也不能自动给用户文章添加 CTA、标题高亮或虚构封面信息。

判断：借鉴章节层级、文字型与图片型版式的区别；保持标题、列表顺序、表格、图片及其原始语义。现有自动目录和图片说明继续沿用用户开关，不新增重复机制。

### 3.4 TypeZen：72 是组合规模，不是 72 种结构

模板生成器依次遍历六个风格的各 12 个配色，调用同一个 `getStylesByCategory`。设置面板将模板与细节调整分层。

证据：[模板生成与渲染](https://github.com/mspringjade/wechat-formatter/blob/5d84e5004aef2395bb1626fd731cd7beb4ca6db3/app/template-engine.ts)、[设置面板](https://github.com/mspringjade/wechat-formatter/blob/5d84e5004aef2395bb1626fd731cd7beb4ca6db3/app/_components/settings-pane.tsx)。

判断：框架内少量配色，不复制 72 张模板卡。高饱和、硬投影、粗边框和三栏工作台不是手机长文的默认方向。现有 7 场景 × 2 版式不改成其六个风格分类。

来源边界：README 中许可说明还含额外限制表述，与标准 LICENSE 文本存在需要澄清的地方；这里不作许可兼容结论，也不直接复用代码、主题和图片。AGPL 项目继续保留自己的真实来源记录，不用“研究后重构”作为删除既有 NOTICE 的理由。

## 4. 公开故障样本：增加验证，不能宣布“零损失”

| 样本 | 观察与状态 | 对本计划的影响 |
| --- | --- | --- |
| [doocs #1916](https://github.com/doocs/md/issues/1916) | 用户反馈衬线字体预览正常、粘贴后丢失；已关闭，维护者后续请复测 | 字体栈序列化和回退测试；不保证接收端安装某种字体 |
| [doocs #1944](https://github.com/doocs/md/issues/1944) | 表格滚动／溢出问题；已关闭，评论中重新粘贴后恢复，具体根因未充分确定 | 后台保存后再看预览；不只检查首次粘贴，不认定所有滚动方案都可靠 |
| [WeMD #96](https://github.com/tenngoxars/WeMD/issues/96) | 预览无空行、粘贴后多空行；已关闭，维护者说明 Web/PWA 已修 | 引用和信息组件加入嵌套间距、后台保存回归 |
| [WeMD #81](https://github.com/tenngoxars/WeMD/issues/81) | 复制流程写死表格字号，覆盖主题字号；已关闭 | 安全规则与视觉参数分离，表格继承用户字号 |
| [WeMD #89](https://github.com/tenngoxars/WeMD/issues/89) | 用户希望表格换行／横向滚动可选；已关闭 | 承认宽表格确有阅读风险，但本轮不做自动重排或表格转图片 |

这些是已读取原始 issue 与相关评论的历史风险样本，不能作为竞品优劣排名或当前故障率。新字体、间距、背景和结构必须用自己的真实输出回归。

## 5. 当前插件的实际起点

| 观察到的实现 | 源码依据 | 结论与置信度 |
| --- | --- | --- |
| 14 个精选 ID，7 场景各 2 个；另有 5 个历史 ID | `src/core/theme/themeCatalog.ts`、`src/templates/index.ts` | 保留现有目录，事实明确 |
| 卡片只显示名称，推荐用途在底部；历史按钮已存在 | `src/settings/ThemeGalleryModal.ts` | 不倒退为满屏内容卡，事实明确 |
| 试用更改主预览，画廊没有共享文章预览 | 同上、`src/view.ts` 的 `applyThemeTrial/openThemeGallery` | 选主题时难看到效果，源码事实；体验来自上一轮界面研究及用户反馈 |
| 列表、引用、图片等视觉规则由公共 baseline 覆盖 | `wechatReadingBaseline.ts`、`templateStylePlan.ts` | 主题差异被部分抹平，事实明确；不能据此说全部主题相同 |
| `TemplateStyles.container` 没有在 `applyStylePlan` 中应用；背景模块写入整个根 style，并固定 16px/20px 留白 | `templateStylePlan.ts`、`backgroundManager.ts`、`themeManifestBridge.ts` | 根背景、色彩、留白缺少明确所有者；导入主题写入的 container 不等于实际生效 |
| 手机演示脚本手写近似排版，包括 container 和各类基线 | `scripts/render-mobile-theme-fixture.mjs` | 演示与真实运行存在实现漂移风险，不能当端到端验证 |
| 结构测试去掉十六进制颜色后比较 CSS 字符串 | `tests/theme-curation-3.15.test.mjs` | 字符串不同不等于视觉区别明显，需要实际渲染指标与同文灰阶对照 |
| 快照只存 ID、背景、字体、字号、配方等，不存样式版本与内容 | `src/settings/settings.ts` 的 `LayoutSnapshot` | 保留 ID 无法保证未来旧样式可恢复；不能把现有快照叫完整视觉冻结 |
| `mergePresetCatalog` 用发行定义覆盖旧定义，但保留显示偏好 | `src/core/settings/catalogMerge.ts` | 新版需要独立版本解析，不能仅靠 data.json 中的模板数组保存旧版 |
| 复制／导出已有共享规范化与安全处理，配方重置也已存在 | `legacyWechatPipeline.ts`、`copyManager.ts`、`articleRecipeFormatter.ts`、`view.ts` | 复用主链路，不重造复制器；保存和取消应扩展到完整外观草稿 |
| `SettingsRepository` 串行写入，持久化成功后提交内存 | `src/core/settings/settingsRepository.ts` | 用局部字段事务扩展，不能整体覆盖旧的设置快照 |

## 6. 机会排序

1. 高优先级：版本化兼容、共享真实预览、安全试用。影响旧稿件和每次主题选择；证据强，但没有总体使用频率统计。
2. 高优先级：14 套版式的结构与节奏、根背景的明确优先级、共用真实输出测试。直接影响手机阅读；需真实宿主与后台验证效果。
3. 中优先级：每版式三个精选配色、跟随主题／更紧凑／更舒展。改善调整自由度，但必须等前两项稳固后加入。
4. 暂缓：暗色阅读模拟、收藏／最近使用快捷选择、代码配色大全、宽表格转换、可视化设计器。不是本轮目标；用户已有入口和手机模式不能反复建设。

## 7. 标准与不确定性

- 新版式普通文字以 [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) 的 4.5:1 为门槛；背景透明时需合成实际背景，不能只算白底。对用户自定义复杂背景只提示风险，不宣称已认证，也不擅自改色。
- 以 [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) 的 320 CSS px 作为重要检查宽度；这不是宣称插件整体通过 WCAG 认证，也不要求二维表格失去结构来通过窄屏检查。
- 发行遵循插件现有工作流与 [官方目录管理说明](https://docs.obsidian.md/community-directory/manage-entry)；GitHub 发行、目录扫描和真实应用更新分开核验。
- 无新增用户调研样本，不能将本人的设计判断写成“多数用户更喜欢”。字体、微信保存规则、不同平台的测量仍有环境差异。

下一份文档 [THEME_EXPERIENCE_UPGRADE_PLAN.md](THEME_EXPERIENCE_UPGRADE_PLAN.md) 把这些证据转换为可执行步骤、测试和发布门槛。
