
# vocab-viewer v3.2

- 完整功能：CSV 导入（本地/直链）、导出、搜索、类别/标签筛选、排序、抽认卡模式；
- 主题：默认白底；夜间为 GitHub Dark 风格；输入框/下拉自适应主题；
- 文案：UI 语言中/英（按钮切换），内容语言（仅中/仅英/双语）；
- 数据：默认从 `/public/data/vocab.csv` 加载；根目录含 `vocab_template.csv`。

## 部署到 Vercel
1. 上传本项目到 GitHub 仓库；
2. Vercel 导入仓库，构建命令 `npm run build`，输出目录 `dist`；
3. 部署成功后访问 `https://*.vercel.app`。

## CSV 表头（可选，支持中文/英文等同义别名）
- 标题/释义（至少一边存在即可显示）：
  - 中文标题：`zh_title` / `中文标题` / `标题`
  - 英文标题：`en_title` / `term` / `term_en` / `英文标题`
  - 中文释义：`zh_def` / `中文释义` / `释义` / `definition_cn`
  - 英文释义：`en_def` / `definition` / `meaning` / `英文释义`
- 分类：`category` / `类别`
- 标签：`tags` / `标签`（多个用分号 `;`）
- 例句：`example` / `例句`
- 详情：`details` / `背景` / `备注`
- 图片：`images` / `图片`（多个用分号 `;`）
- 频率权重：`frequency` / `freq` / `权重`

## 教学建议
- 老师只需编辑 `public/data/vocab.csv`（UTF-8）并 push，Vercel 自动更新；
- 或用“数据导入”从 GitHub Raw 链接导入试读；
- 学生直接访问网址即可查看。

