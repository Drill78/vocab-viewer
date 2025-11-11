
# Vocabulary Viewer 2.0 （无后端 · Vite + React + Tailwind）

- 支持 **中/英/双语** 展示（语言模式开关：仅中文 / 仅英文 / 双语）。
- **表头完全可选**：自动识别中英文列名；尽量容错。
- 轻量 UI：默认**白底低饱和卡片**；夜间模式近似 GitHub Dark。
- 功能：搜索、按**类别**和**标签**筛选、按字母/频率/最近排序、乱序抽认卡、导入/导出 CSV。
- 默认从 `public/data/vocab.csv` 加载（只读）。

## 目录结构
```
/public/data/vocab.csv        # 学生端默认读取的词汇表
/vocab_template.csv           # 给教师的通用模板（可重复使用）
/src/App.tsx                  # 单页应用核心代码
```

## 本地运行（可选）
```bash
npm install
npm run dev
```

## 构建（Vercel 会自动执行）
```bash
npm run build
npm run preview
```

## 教师：如何制作词汇表（CSV）
- **编码**：UTF-8（Excel 导出时选择 CSV UTF-8）
- **分隔符**：英文逗号 `,`
- **多值字段**：分号 `;` 分隔（如 tags、images）
- **表头可用的列名集合**（取其一即可）：

| 语义 | 英文列名（任取其一） | 中文列名（任取其一） |
|------|-----------------------|----------------------|
| 中文标题 | `zh_title` | `中文标题` `标题` |
| 英文标题 | `en_title` `term_en` `term` | `英文标题` |
| 中文释义 | `zh_def` `definition_cn` | `中文释义` `释义` |
| 英文释义 | `en_def` `definition` `meaning` | `英文释义` |
| 类别 | `category` `class` `type` | `类别` |
| 标签 | `tags` | `标签` |
| 例句 | `example` | `例句` |
| 详情 | `details` | `背景` `备注` |
| 图片URL | `images` | `图片` |
| 频率权重 | `frequency` `freq` | `权重` |

> **最小要求**：只要 **中文或英文标题** 与 **对应释义** 中至少有一边存在（例如 `zh_title`+`zh_def`，或 `en_title`+`en_def`），该行就会显示。两边都没有时，该行会被跳过。

### 模板
可直接复制 `vocab_template.csv`，或从项目根目录下载后填写。

## Vercel 部署
- Import Git Repository → 选择此仓库
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- 部署成功后访问生成的 `https://xxx.vercel.app`

## 常见问题
- **看不到分类**：请确认 CSV 中的 `category`（或“类别”）列有值；类别下拉只展示实际存在的类别集合。
- **看不到标签**：请用 `;` 分隔多个标签。
- **暗色切换没生效**：本版已修复；切换会在 `html` 上添加/移除 `dark` 类，并持久化到 `localStorage`。
