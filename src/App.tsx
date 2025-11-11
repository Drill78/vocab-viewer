import React, { useState, useEffect } from "react";
import { Sun, Moon, Globe } from "lucide-react";
import { ThemedInput, ThemedSelectTrigger } from "./ThemedInputs";
import { i18n } from "./i18n";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [uiLang, setUiLang] = useState("zh");
  const [langMode, setLangMode] = useState("both");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const t = (key: string) => i18n[uiLang][key];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors">
      <header className="p-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          {/* UI语言切换 */}
          <button
            className="px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
            onClick={() => setUiLang(uiLang === "zh" ? "en" : "zh")}
          >
            <Globe className="h-4 w-4" /> {t("langSwitch")}
          </button>

          {/* 内容语言模式切换 */}
          <ThemedSelectTrigger
            value={langMode}
            onChange={(e: any) => setLangMode(e.target.value)}
            className="px-3 py-2 rounded-md border"
          >
            <option value="zh">{t("zhOnly")}</option>
            <option value="en">{t("enOnly")}</option>
            <option value="both">{t("both")}</option>
          </ThemedSelectTrigger>

          {/* 明暗主题切换 */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? t("lightMode") : t("darkMode")}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-4">
        <ThemedInput placeholder={t("searchPlaceholder")} />
        <ThemedSelectTrigger>
          <option>{t("allCategories")}</option>
          <option>逻辑 Logic</option>
          <option>哲学 Philosophy</option>
        </ThemedSelectTrigger>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("demoTip")}</p>
      </main>
    </div>
  );
}
