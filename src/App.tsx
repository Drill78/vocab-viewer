
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Papa from "papaparse";
import { Moon, Sun, Shuffle, RotateCcw, Eye, EyeOff, Info, Download, Link as LinkIcon, Search, Globe, Star } from "lucide-react";
import { ThemedInput, ThemedSelectTrigger } from "./ThemedInputs";
import { i18n, UILang } from "./i18n";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; err?: any}> {
  constructor(props: any){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(err: any){ return { hasError: true, err }; }
  componentDidCatch(err: any, info: any){ console.error('App crashed:', err, info); }
  render(){
    if(this.state.hasError){
      return (
        <div className="min-h-screen p-6 text-sm bg-white dark:bg-[#0d1117] text-neutral-900 dark:text-[#c9d1d9]">
          <h2 className="text-lg font-bold">页面加载遇到问题 / Something went wrong</h2>
          <p className="mt-2">请刷新页面；若仍出现，请联系老师或将浏览器控制台错误截图发我。</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}

type Vocab = {
  id: string;
  zhTitle?: string;
  enTitle?: string;
  zhDef?: string;
  enDef?: string;
  category?: string;
  tags?: string[];
  example?: string;
  details?: string;
  images?: string[];
  frequency?: number;
  addedAt?: number;
};

const STORAGE_KEY = "vocab3_3.data";
const PREF_KEY = "vocab3_3.prefs";
const DEFAULT_REMOTE_URL = "/data/vocab.csv";

type LangMode = "zh" | "en" | "both";

function save<T=any>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }
function load<T=any>(k: string, fallback: T): T { try { const raw=localStorage.getItem(k); return raw? JSON.parse(raw): fallback; } catch { return fallback; } }

function normalizeRow(row: Record<string, any>, idx: number): Vocab | null {
  const lower = Object.fromEntries(Object.entries(row).map(([k,v])=>[k.toLowerCase().trim(), v]));
  const pick = (...cands: string[]) => {
    for (const key of cands) {
      const k = key.toLowerCase();
      if (lower[k] !== undefined && lower[k] !== null && String(lower[k]).trim() !== "") return lower[k];
    }
    return undefined;
  };
  const zhTitle = pick("zh_title","中文标题","标题");
  const enTitle = pick("en_title","term_en","term","英文标题","word");
  const zhDef = pick("zh_def","definition_cn","中文释义","释义");
  const enDef = pick("en_def","definition","meaning","英文释义");
  const category = pick("category","class","type","类别");
  const tagsRaw = pick("tags","标签");
  const example = pick("example","例句");
  const details = pick("details","背景","备注");
  const imagesRaw = pick("images","图片");
  const frequency = Number(pick("frequency","freq","权重") ?? NaN);

  const hasZh = (zhTitle || zhDef);
  const hasEn = (enTitle || enDef);
  if (!hasZh && !hasEn) return null;

  return {
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2,7)}`,
    zhTitle: zhTitle? String(zhTitle).trim(): undefined,
    enTitle: enTitle? String(enTitle).trim(): undefined,
    zhDef: zhDef? String(zhDef).trim(): undefined,
    enDef: enDef? String(enDef).trim(): undefined,
    category: category? String(category).trim(): undefined,
    tags: typeof tagsRaw === "string" ? String(tagsRaw).split(/[;,，、\s]+/).filter(Boolean): Array.isArray(tagsRaw)? tagsRaw: undefined,
    example: example? String(example): undefined,
    details: details? String(details): undefined,
    images: typeof imagesRaw === "string" ? String(imagesRaw).split(/[;,，\s]+/).filter(Boolean): Array.isArray(imagesRaw)? imagesRaw: undefined,
    frequency: isFinite(frequency) ? frequency : undefined,
    addedAt: Date.now(),
  };
}

const parseCSVText = (text: string) => new Promise<Vocab[]>((resolve) => {
  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      const rows = res.data as Record<string, any>[];
      const out: Vocab[] = [];
      rows.forEach((r, i) => { const v = normalizeRow(r, i); if (v) out.push(v); });
      resolve(out);
    },
  });
});

const PALETTES = ["bg-rose-50","bg-amber-50","bg-emerald-50","bg-sky-50","bg-violet-50","bg-fuchsia-50"];
const pickPalette = (i:number) => PALETTES[i % PALETTES.length];

export default function App() {
  const [data, setData] = useState<Vocab[]>(load<Vocab[]>(STORAGE_KEY, []));
  const [uiLang, setUiLang] = useState<UILang>(() => (localStorage.getItem(PREF_KEY+":uiLang") as UILang) || "zh");
  const [lang, setLang] = useState<LangMode>(() => (localStorage.getItem(PREF_KEY+":lang") as LangMode) || "both");
  const [dark, setDark] = useState<boolean>(load<boolean>(PREF_KEY+":dark", false)); // default light
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"alpha"|"recent"|"freq">("alpha");
  const [flashMode, setFlashMode] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flipOpen, setFlipOpen] = useState<Record<string, boolean>>({});
  const [favs, setFavs] = useState<Record<string, true>>(()=> load(PREF_KEY+":favs", {}));
  const [favOnly, setFavOnly] = useState<boolean>(()=> load(PREF_KEY+":favOnly", false));

  const urlRef = useRef<HTMLInputElement|null>(null);
  const fileRef = useRef<HTMLInputElement|null>(null);

  useEffect(()=>{
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.setProperty("--safe-top", "env(safe-area-inset-top)");
    document.documentElement.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom)");
    save(PREF_KEY+":dark", dark);
  }, [dark]);
  useEffect(()=> save(PREF_KEY+":uiLang", uiLang), [uiLang]);
  useEffect(()=> save(PREF_KEY+":lang", lang), [lang]);
  useEffect(()=> save(STORAGE_KEY, data), [data]);
  useEffect(()=> save(PREF_KEY+":favs", favs), [favs]);
  useEffect(()=> save(PREF_KEY+":favOnly", favOnly), [favOnly]);

  useEffect(()=>{
    (async ()=>{
      if (data.length) return;
      try{
        setLoading(true); setProgress(10);
        const res = await fetch(DEFAULT_REMOTE_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("no remote");
        setProgress(40);
        const text = await res.text(); setProgress(75);
        const out = await parseCSVText(text); setProgress(95);
        setData(out);
        toast.success(`${uiLang==='zh' ? '已载入' : 'Loaded'} /data/vocab.csv: ${out.length}`);
      } catch {
        const sample = "zh_title,en_title,zh_def,en_def,category,tags\n演绎法,Deduction,从一般到特殊的推理,Reasoning from general to specific,逻辑学,哲学;课堂\n";
        const out = await parseCSVText(sample); setData(out);
        toast(uiLang==='zh' ? "未找到固定数据源，已载入示例数据" : "No fixed data found; sample loaded");
      } finally { setTimeout(()=>setLoading(false), 200); setProgress(100); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCategories = useMemo(()=>{
    const s = new Set<string>(); data.forEach(v => v.category && s.add(v.category));
    return ["all", ...Array.from(s).sort((a,b)=> a.localeCompare(b))];
  }, [data]);
  const allTags = useMemo(()=>{
    const s = new Set<string>(); data.forEach(v => v.tags?.forEach(t=> s.add(t)));
    return ["all", ...Array.from(s).sort((a,b)=> a.localeCompare(b))];
  }, [data]);

  const filtered = useMemo(()=>{
    let arr = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(v => [
        v.zhTitle, v.enTitle, v.zhDef, v.enDef, v.category, v.example, (v.tags||[]).join(" ")
      ].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    if (category !== "all") arr = arr.filter(v => (v.category||"") === category);
    if (tag !== "all") arr = arr.filter(v => v.tags?.some(t => t === tag));
    if (favOnly) arr = arr.filter(v => !!favs[v.id]);

    let out = [...arr];
    if (sortBy === "alpha") {
      out.sort((a,b)=> (a.enTitle||a.zhTitle||"").localeCompare(b.enTitle||b.zhTitle||""));
    } else if (sortBy === "recent") {
      out.sort((a,b)=> (b.addedAt||0) - (a.addedAt||0));
    } else if (sortBy === "freq") {
      out.sort((a,b)=> (b.frequency||0) - (a.frequency||0));
    }
    return out;
  }, [data, query, category, tag, sortBy, favOnly, favs]);

  const studyList = filtered.length ? filtered : data;
  const current = studyList[idx % Math.max(1, studyList.length)] || null;

  async function handleFile(file: File) {
    setLoading(true); setProgress(10);
    const text = await file.text(); setProgress(40);
    const out = await parseCSVText(text); setProgress(80);
    setData(out); setProgress(100); setTimeout(()=>setLoading(false),200);
    toast.success(`${uiLang==='zh' ? '导入成功' : 'Imported'}: ${out.length}`);
  }
  async function handleURL(url: string) {
    if (!url) return;
    try { setLoading(true); setProgress(10);
      const res = await fetch(url); setProgress(40);
      const text = await res.text(); setProgress(70);
      const out = await parseCSVText(text); setProgress(95);
      setData(out); setProgress(100); toast.success(`${uiLang==='zh' ? '已从链接导入' : 'Imported from link'}: ${out.length}`);
    } catch { toast.error(uiLang==='zh' ? "从链接导入失败，请检查直链与 CORS" : "Import via link failed. Check direct link & CORS"); }
    finally { setTimeout(()=>setLoading(false),200); }
  }
  function exportCSV() {
    const rows = data.map(v=>({
      zh_title: v.zhTitle||"", en_title: v.enTitle||"", zh_def: v.zhDef||"", en_def: v.enDef||"",
      category: v.category||"", tags: (v.tags||[]).join(";"), example: v.example||"",
      details: v.details||"", images: (v.images||[]).join(";"), frequency: v.frequency??""
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "vocabulary-export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleFav(id: string) {
    setFavs(prev => {
      const n = { ...prev };
      if (n[id]) { delete n[id]; }
      else { n[id] = true; }
      return n;
    });
  }

  function handleFlipClick(e: React.MouseEvent, id: string) {
    const target = e.target as HTMLElement;
    const interactive = target.closest("button, a, input, select, textarea, label, summary, [data-noflip]");
    const selObj = typeof window !== 'undefined' && typeof window.getSelection === 'function' ? window.getSelection() : null;
    const selected = !!(selObj && selObj.toString() && selObj.toString().length > 0);
    if (interactive || selected) return;
    setFlipOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  /** 正面：标题 + 基础释义（中/英按模式显示） */
  function renderFront(v: Vocab) {
    return (
      <div className="space-y-2">
        <div className="space-y-1">
          {(lang === "zh" || lang === "both") && v.zhTitle && <div className="text-lg sm:text-xl font-bold">{v.zhTitle}</div>}
          {(lang === "en" || lang === "both") && v.enTitle && <div className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">{v.enTitle}</div>}
          {(!(v.zhTitle||v.enTitle)) && <div className="text-sm text-neutral-500">（no title）</div>}
        </div>
        {(lang === "zh" || lang === "both") && v.zhDef && <p className="text-[13px] sm:text-sm leading-relaxed">{v.zhDef}</p>}
        {(lang === "en" || lang === "both") && v.enDef && <p className="text-xs sm:text-[13px] text-neutral-700 dark:text-neutral-400">{v.enDef}</p>}
      </div>
    );
  }

  /** 背面：更多信息（例句、详情、类别/标签） */
  function renderBack(v: Vocab) {
    return (
      <div className="space-y-2 text-left" data-noflip>
        {v.example && <p className="text-xs sm:text-sm italic text-neutral-500 dark:text-neutral-400">“{v.example}”</p>}
        {v.details && (
          <details className="text-xs sm:text-sm" data-noflip>
            <summary className="cursor-pointer select-none" onClick={(e)=> e.stopPropagation()}>详情 / Details</summary>
            <div className="mt-1 whitespace-pre-wrap">{v.details}</div>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          {v.category && <span className="px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-[#161b22] text-xs">{v.category}</span>}
          {(v.tags||[]).map((t,i)=>(<span key={i} className="px-2 py-0.5 rounded-full border text-xs">{t}</span>))}
        </div>
      </div>
    );
  }

  const t = (key: keyof typeof i18n.zh) => i18n[uiLang][key];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-[#0d1117] text-neutral-900 dark:text-[#c9d1d9] transition-colors">
        <Toaster richColors position="top-center" />
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-[calc(12px+var(--safe-top,0px))] pb-[calc(24px+var(--safe-bottom,0px))]">
          <header className="sticky top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 pt-2 pb-3 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur rounded-b-2xl">
            <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('subtitle')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* UI language toggle */}
                <button
                  className="h-10 px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-[#161b22] dark:text-[#c9d1d9]"
                  onClick={()=> setUiLang(uiLang === 'zh' ? 'en' : 'zh')}
                  title={t('uiLang')}
                >
                  <Globe className="h-4 w-4" /> {uiLang.toUpperCase()}
                </button>
                {/* content language mode */}
                <ThemedSelectTrigger className="h-10" value={lang} onChange={(e:any)=> setLang(e.target.value)}>
                  <option value="zh">{t('zhOnly')}</option>
                  <option value="en">{t('enOnly')}</option>
                  <option value="both">{t('both')}</option>
                </ThemedSelectTrigger>
                {/* theme toggle */}
                <button
                  className="h-10 px-3 py-2 rounded-md border flex items-center gap-2 bg-white text-neutral-800 dark:bg-[#161b22] dark:text-[#c9d1d9]"
                  onClick={()=> setDark(d=>!d)}
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{dark ? t('light') : t('dark')}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Import */}
          <section className="mt-4">
            <div className="rounded-2xl border p-3 sm:p-4 shadow bg-white dark:bg-[#161b22] dark:border-[#30363d]">
              <div className="text-sm font-semibold mb-2">{t('dataImport')}</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <input type="file" accept=".csv" ref={fileRef} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); }} className="block w-full text-sm" />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <ThemedInput placeholder={t('importFromLink')} ref={urlRef as any} />
                  <button className="h-10 px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={()=> handleURL((urlRef.current as any)?.value || "")}>
                    <LinkIcon className="h-4 w-4"/> {t('importBtn')}
                  </button>
                  <button className="h-10 px-3 py-2 rounded-md border text-sm" onClick={async()=>{
                    const sample = "zh_title,en_title,zh_def,en_def,category,tags\\n演绎法,Deduction,从一般到特殊的推理,Reasoning from general to specific,逻辑学,哲学;课堂\\n";
                    const out = await parseCSVText(sample); setData(out); toast(uiLang==='zh'?'已载入示例':'Sample loaded');
                  }}>{t('sampleBtn')}</button>
                </div>
                {loading && <div className="md:col-span-3 text-sm text-neutral-500">... {progress}%</div>}
              </div>
            </div>
          </section>

          {/* Toolbar */}
          <section className="mt-3 sm:mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <ThemedInput className="w-full h-10 pl-9" placeholder={t('searchPlaceholder')} value={query} onChange={(e)=> setQuery((e.target as any).value)} />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
              </div>
              <ThemedSelectTrigger className="h-10" value={category} onChange={(e:any)=> setCategory(e.target.value)}>
                {allCategories.map(c => <option key={c} value={c}>{c==="all"? t('allCategories'): c}</option>)}
              </ThemedSelectTrigger>
              <ThemedSelectTrigger className="h-10" value={tag} onChange={(e:any)=> setTag(e.target.value)}>
                {allTags.map(tg => <option key={tg} value={tg}>{tg==="all"? t('allTags'): tg}</option>)}
              </ThemedSelectTrigger>
              <ThemedSelectTrigger className="h-10" value={sortBy} onChange={(e:any)=> setSortBy((e.target.value) as any)}>
                <option value="alpha">{t('sortAlpha')}</option>
                <option value="recent">{t('sortRecent')}</option>
                <option value="freq">{t('sortFreq')}</option>
              </ThemedSelectTrigger>
              <label className="inline-flex items-center gap-2 text-sm ml-2">
                <input type="checkbox" checked={favOnly} onChange={(e)=> setFavOnly(e.target.checked)} /> {t('favOnly')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={flashMode} onChange={(e)=> setFlashMode(e.target.checked)} /> {t('flashMode')}
              </label>
              <button onClick={()=>exportCSV()} className="h-10 px-3 py-2 rounded-md border text-sm flex items-center gap-1">
                <Download className="h-4 w-4" /> {t('export')}
              </button>
              <button onClick={()=>{ setQuery(''); setCategory('all'); setTag('all'); setSortBy('alpha'); setFavOnly(false); }} className="h-10 px-3 py-2 rounded-md border text-sm flex items-center gap-1">
                <RotateCcw className="h-4 w-4" /> {t('reset')}
              </button>
            </div>
          </section>

          {/* List mode with flip and favorite */}
          {!flashMode && (
            <section className="mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {(filtered.length ? filtered : data).map((v, i) => {
                  const flipped = !!flipOpen[v.id];
                  const starred = !!favs[v.id];
                  return (
                    <motion.div key={v.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <div className={`relative p-4 sm:p-5 rounded-2xl border shadow ${pickPalette(i)} dark:bg-[#161b22] dark:border-[#30363d]`}
                           onClick={(e)=> handleFlipClick(e, v.id)}>
                        <button
                          className={`absolute right-3 top-3 p-2 rounded-md border text-xs flex items-center justify-center ${starred?'bg-yellow-200/70 dark:bg-yellow-300/20':''}`}
                          title={starred ? t('starred') : t('unstarred')}
                          onClick={(e)=> { e.stopPropagation(); toggleFav(v.id); }}
                        >
                          <Star className={`h-4 w-4 ${starred? 'fill-yellow-400 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-300':''}`} />
                        </button>

                        <motion.div
                          key={String(flipped)}
                          initial={{ rotateY: 180, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          transition={{ duration: 0.35 }}
                          className="min-h-[120px] sm:min-h-[140px]"
                        >
                          {!flipped ? (
                            <div className="space-y-2">{renderFront(v)}</div>
                          ) : (
                            <div className="space-y-2">{renderBack(v)}</div>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </section>
          )}

          {/* Flashcards */}
          {flashMode && (
            <section className="mt-6">
              <div className="rounded-2xl border p-6 shadow bg-white dark:bg-[#161b22] dark:border-[#30363d]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-neutral-500">{t('count')} {studyList.length} {uiLang==='zh'? '项 · 第': t('item')}{studyList.length ? (idx % studyList.length)+1 : 0}{t('of')}{studyList.length}</div>
                  <div className="flex items-center gap-2">
                    <button className="h-10 px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={()=> setShowBack(s=>!s)}>
                      {showBack ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="hidden sm:inline">{showBack ? t('hideBack') : t('showBack')}</span>
                    </button>
                    <button className="h-10 px-3 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm" onClick={()=> setIdx(i => (i+1) % Math.max(1, studyList.length))}>
                      <Shuffle className="h-4 w-4" /> <span className="hidden sm:inline">{t('next')}</span>
                    </button>
                  </div>
                </div>

                {current ? (
                  <motion.div key={current.id + String(showBack)} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="grid gap-4 text-center select-none">
                    {!showBack ? (
                      <div className="space-y-2">{renderFront(current)}</div>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-2">{renderBack(current)}</div>
                    )}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button className="h-10 px-3 py-2 rounded-md border text-sm" onClick={()=> setIdx(i => (i - 1 + Math.max(1, studyList.length)) % Math.max(1, studyList.length))}>{t('prev')}</button>
                      <button className="h-10 px-3 py-2 rounded-md border text-sm" onClick={()=> setIdx(i => (i + 1) % Math.max(1, studyList.length))}>{t('next')}</button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center text-neutral-500">{t('empty')}</div>
                )}
              </div>
            </section>
          )}

          {/* About */}
          <section className="mt-8">
            <details>
              <summary className="cursor-pointer select-none text-sm flex items-center gap-1"><Info className="h-4 w-4"/> {t('about')}</summary>
              <div className="mt-3 space-y-2 text-sm leading-6">
                <p>{t('aboutText')}</p>
              </div>
            </details>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}
