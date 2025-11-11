# 词汇表展示网页 v3

一个适合教学场景的词汇表展示网站，支持：
- 多语言界面（中文 / 英文）
- 明暗主题切换（白天模式 / 夜间模式）
- 中英文内容切换（仅中 / 仅英 / 双语）
- 自适应搜索栏与下拉菜单主题
- 移动端适配

## 教师使用指南

1. **填写 CSV 文件**
   - 表头支持中英文混用，例如：
     | zh_title | en_title | zh_def | en_def | category | tags | example |
   - 仅需填写中文或英文任意一边即可；
   - 文件名为 `vocab.csv`，放在项目 `public/data/` 下。

2. **部署**
   - 上传整个项目到 GitHub；
   - 在 [Vercel](https://vercel.com) 导入仓库，点击 **Deploy** 即可；
   - 学生访问自动加载 `public/data/vocab.csv`。

3. **模板文件**
   - 根目录内含 `vocab_template.csv`，教师可直接复制填写。

