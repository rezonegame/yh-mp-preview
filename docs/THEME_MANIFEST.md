# ThemeManifest V3

ThemeManifest 是 V3 的可移植主题交换格式。它只描述主题令牌、组件样式和文章配方；导入后会转换成插件现有的“自定义模板”，所以不会绕过微信兼容性校验。

## 最小示例

```json
{
  "schemaVersion": 3,
  "id": "my-blue-theme",
  "name": "My Blue Theme",
  "version": "1.0.0",
  "license": "AGPL-3.0-or-later",
  "source": "https://example.org/my-blue-theme",
  "tokens": {
    "accent": "#2878d4",
    "text": "#25324a",
    "mutedText": "#667085",
    "background": "#ffffff",
    "fontSize": "16px",
    "lineHeight": "1.8"
  },
  "components": [
    { "id": "heading-1", "legacyStyle": "font-weight: 700;" },
    { "id": "paragraph", "legacyStyle": "margin: 1em 0;" }
  ],
  "recipes": [
    { "id": "tutorial", "name": "教程", "componentIds": ["steps", "summary"] }
  ],
  "compatibility": {
    "mode": "legacy",
    "notes": ["使用 V2 渲染器的内联样式桥接。"]
  }
}
```

## 导入与导出

- 在“设置 → 模板选项 → 主题工作室（V3）”粘贴 JSON 导入。
- 自定义模板行右侧的“复制 ThemeManifest”按钮可导出 JSON。
- `id` 必须唯一，且只能由小写字母、数字和连字符组成。
- 导入器要求 schema、许可证、令牌、组件和配方字段完整；不合规的文件不会写入设置。

## 维护规则

- 所有公开主题必须注明 `license` 和可追溯 `source`。
- `Core` 是内置维护主题；`Classic` 是确认过来源的历史主题；`Legacy` 是用户本地兼容项；来源或授权不能确认的主题进入 `Quarantine`，不随发行版分发。
- 标准组件 ID 包括：`toc`、`steps`、`checklist`、`quote-card`、`summary`、`author-card`、`subscribe`、`faq`、`timeline`、`comparison-table`。
- V3 当前不含 AI 或图片生成功能，也不接受需要在线服务才能工作的主题包。
