
export type UILang = 'zh' | 'en';

export const i18n = {
  zh: {
    title: "词汇表展示",
    searchPlaceholder: "搜索词汇…",
    allCategories: "全部类别",
    lightMode: "白天模式",
    darkMode: "夜间模式",
    langSwitch: "UI语言",
    zhOnly: "仅中文",
    enOnly: "仅英文",
    both: "中英双语",
    demoTip: "明暗主题适配的输入框与下拉菜单 + 独立的 UI 语言切换。"
  },
  en: {
    title: "Vocabulary Viewer",
    searchPlaceholder: "Search vocabulary…",
    allCategories: "All Categories",
    lightMode: "Light",
    darkMode: "Dark",
    langSwitch: "UI Language",
    zhOnly: "Chinese only",
    enOnly: "English only",
    both: "Bilingual",
    demoTip: "Inputs & selects adapt to theme + independent UI language toggle."
  }
} as const;
