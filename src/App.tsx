
import React, { useEffect, useState } from 'react'
import { Sun, Moon, Globe } from 'lucide-react'
import { ThemedInput, ThemedSelectTrigger } from './ThemedInputs'
import { i18n, UILang } from './i18n'

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('ui.dark') || 'false'); } catch { return false; }
  });
  const [uiLang, setUiLang] = useState<UILang>(() => {
    try { return (localStorage.getItem('ui.lang') as UILang) || 'zh'; } catch { return 'zh'; }
  });
  const [contentLang, setContentLang] = useState<'zh'|'en'|'both'>(() => {
    try { return (localStorage.getItem('content.lang') as any) || 'both'; } catch { return 'both'; }
  });

  useEffect(()=> {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ui.dark', JSON.stringify(dark));
  }, [dark]);

  useEffect(()=> { localStorage.setItem('ui.lang', uiLang); }, [uiLang]);
  useEffect(()=> { localStorage.setItem('content.lang', contentLang); }, [contentLang]);

  const t = (key: keyof typeof i18n.zh) => i18n[uiLang][key];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] text-neutral-900 dark:text-[#c9d1d9] transition-colors">
      <header className="p-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          {/* UI language toggle */}
          <button
            className="px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-[#161b22] dark:text-[#c9d1d9]"
            onClick={()=> setUiLang(uiLang === 'zh' ? 'en' : 'zh')}
            title={t('langSwitch')}
          >
            <Globe className="h-4 w-4" /> {uiLang.toUpperCase()}
          </button>

          {/* content language mode */}
          <ThemedSelectTrigger value={contentLang} onChange={(e:any)=> setContentLang(e.target.value)}>
            <option value="zh">{t('zhOnly')}</option>
            <option value="en">{t('enOnly')}</option>
            <option value="both">{t('both')}</option>
          </ThemedSelectTrigger>

          {/* theme toggle */}
          <button
            className="px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-[#161b22] dark:text-[#c9d1d9]"
            onClick={()=> setDark(d=>!d)}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? t('lightMode') : t('darkMode')}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ThemedInput placeholder={t('searchPlaceholder')} />
          <ThemedSelectTrigger>
            <option>{t('allCategories')}</option>
            <option>逻辑 / Logic</option>
            <option>哲学 / Philosophy</option>
          </ThemedSelectTrigger>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('demoTip')}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 这里放你的卡片渲染逻辑（略），本演示只展示头部与输入组件的主题/语言切换效果 */}
          <div className="p-4 rounded-2xl border bg-rose-50 dark:bg-[#161b22]">Card A</div>
          <div className="p-4 rounded-2xl border bg-amber-50 dark:bg-[#161b22]">Card B</div>
          <div className="p-4 rounded-2xl border bg-emerald-50 dark:bg-[#161b22]">Card C</div>
        </div>
      </main>
    </div>
  )
}
