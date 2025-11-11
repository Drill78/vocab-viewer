
# Vocabulary Viewer (No-backend, Vite + React + Tailwind)

- 默认 **只读模式**，从 `/data/vocab.csv` 加载；
- `?admin=1` 进入 **管理模式**（本地导入/设置数据源）；
- 支持搜索、类别/首字母/字母/频率/最近导入、乱序、星标、单卡背诵、卡片翻面显示详情与图片。

## 本地开发
```bash
npm install
npm run dev
```

## 构建
```bash
npm run build
npm run preview
```

## 部署到 Vercel
- 直接导入本仓库即可；框架选择 Vite，构建命令 `npm run build`，输出目录 `dist`。
