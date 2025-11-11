
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Papa from "papaparse";
import { Moon, Sun, Shuffle, RotateCcw, Eye, EyeOff, Info, Download, Link as LinkIcon, Search } from "lucide-react";

/** 数据结构：中英双语，所有字段可选 */
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

const STORAGE_KEY = "vocab2.data";
const PREF_KEY = "vocab2.prefs";
const DEFAULT_REMOTE_URL = "/data/vocab.csv";

type LangMode = "zh" | "en" | "both";

function save<T=any>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }
function load<T=any>(k: string, fallback: T): T { try { const raw=localStorage.getItem(k); return raw? JSON.parse(raw): fallback; } catch { return fallback; } }

/** 统一规范化：兼容多种表头（中英混合） */
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

  // 至少要有：中文或英文的标题+释义 任意一边，否则跳过
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

// 低饱和卡片色板（亮色为主）
const PALETTES = [
  "bg-roseSoft",
  "bg-amberSoft",
  "bg-emeraldSoft",
  "bg-skySoft",
  "bg-violetSoft",
  "bg-fuchsiaSoft",
];
const pickPalette = (i:number) => PALETTES[i % PALETTES.length];

export default function App() {
  const [data, setData] = useState<Vocab[]>(load<Vocab[]>(STORAGE_KEY, []));
  const [lang, setLang] = useState<LangMode>(load<LangMode>(PREF_KEY+":lang", "both"));
  const [dark, setDark] = useState<boolean>(load<boolean>(PREF_KEY+":dark", false)); // 默认明亮
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"alpha"|"recent"|"freq">("alpha");
  const [flashMode, setFlashMode] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const urlRef = useRef<HTMLInputElement|null>(null);
  const fileRef = useRef<HTMLInputElement|null>(null);

  useEffect(()=>{
    document.documentElement.classList.toggle("dark", dark);
    save(PREF_KEY+":dark", dark);
  }, [dark]);
  useEffect(()=> save(PREF_KEY+":lang", lang), [lang]);
  useEffect(()=> save(STORAGE_KEY, data), [data]);

  // 首次加载：若本地无数据，尝试 public/data/vocab.csv
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
        toast.success(`已从 /data/vocab.csv 载入：${out.length} 条`);
      } catch {
        // 提供一个最小样例，避免空白页
        const sample = "zh_title,en_title,zh_def,en_def,category,tags\n演绎法,Deduction,从一般到特殊的推理,Reasoning from general to specific,逻辑学,哲学;课堂\n";
        const out = await parseCSVText(sample); setData(out);
        toast("未找到固定数据源，已载入示例数据");
      } finally { setTimeout(()=>setLoading(false), 200); setProgress(100); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 聚合筛选数据
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

    let out = [...arr];
    if (sortBy === "alpha") {
      out.sort((a,b)=> (a.enTitle||a.zhTitle||"").localeCompare(b.enTitle||b.zhTitle||""));
    } else if (sortBy === "recent") {
      out.sort((a,b)=> (b.addedAt||0) - (a.addedAt||0));
    } else if (sortBy === "freq") {
      out.sort((a,b)=> (b.frequency||0) - (a.frequency||0));
    }
    return out;
  }, [data, query, category, tag, sortBy]);

  const studyList = filtered.length ? filtered : data;
  const current = studyList[idx % Math.max(1, studyList.length)] || null;

  async function handleFile(file: File) {
    setLoading(true); setProgress(10);
    const text = await file.text(); setProgress(40);
    const out = await parseCSVText(text); setProgress(80);
    setData(out); setProgress(100); setTimeout(()=>setLoading(false),200);
    toast.success(`导入成功：${out.length} 条词汇`);
  }
  async function handleURL(url: string) {
    if (!url) return;
    try { setLoading(true); setProgress(10);
      const res = await fetch(url); setProgress(40);
      const text = await res.text(); setProgress(70);
      const out = await parseCSVText(text); setProgress(95);
      setData(out); setProgress(100); toast.success(`已从链接导入：${out.length} 条`);
    } catch { toast.error("从链接导入失败，请检查直链与 CORS"); }
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

  function resetAll() {
    setQuery(""); setCategory("all"); setTag("all"); setSortBy("alpha");
  }

  function nextCard() { setIdx(i => (i + 1) % Math.max(1, studyList.length)); setShowBack(false); }
  function prevCard() { setIdx(i => (i - 1 + Math.max(1, studyList.length)) % Math.max(1, studyList.length)); setShowBack(false); }

  // 卡片正反面内文（受语言模式控制）
  function renderFront(v: Vocab) {
    return (
      <div className="space-y-1">
        {(lang === "zh" || lang === "both") && v.zhTitle && <div className="text-xl font-bold">{v.zhTitle}</div>}
        {(lang === "en" || lang === "both") && v.enTitle && <div className="text-sm text-neutral-600 dark:text-neutral-400">{v.enTitle}</div>}
        {(!(v.zhTitle||v.enTitle)) && <div className="text-sm text-neutral-500">（无标题）</div>}
      </div>
    );
  }
  function renderBack(v: Vocab) {
    return (
      <div className="space-y-2">
        {(lang === "zh" || lang === "both") && v.zhDef && <p className="text-sm leading-relaxed">{v.zhDef}</p>}
        {(lang === "en" || lang === "both") && v.enDef && <p className="text-xs text-neutral-600 dark:text-neutral-400">{v.enDef}</p>}
        {v.example && <p className="text-xs italic text-neutral-500 dark:text-neutral-400 mt-1">“{v.example}”</p>}
        <div className="flex flex-wrap gap-2">
          {v.category && <span className="px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-gh-soft text-xs">{v.category}</span>}
          {(v.tags||[]).map((t,i)=>(<span key={i} className="px-2 py-0.5 rounded-full border text-xs">{t}</span>))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gh-bg text-neutral-900 dark:text-gh-text">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">词汇表 · Vocabulary</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">低饱和卡片 · 明亮默认主题 · 中英切换 · 类别/标签筛选 · 抽认卡模式</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 语言切换 */}
            <select className="px-3 py-2 rounded-md border dark:bg-gh-soft" value={lang} onChange={(e)=> setLang(e.target.value as LangMode)}>
              <option value="zh">仅中文</option>
              <option value="en">仅英文</option>
              <option value="both">中英双语</option>
            </select>

            {/* 主题切换（默认亮色） */}
            <button className="px-3 py-2 rounded-md border dark:border-gh-border flex items-center gap-2" onClick={()=> setDark(d=>!d)} title="切换明/暗">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? "浅色" : "深色"}
            </button>

            <button onClick={exportCSV} className="px-3 py-2 rounded-md border text-sm flex items-center gap-1">
              <Download className="h-4 w-4" /> 导出
            </button>
            <button onClick={resetAll} className="px-3 py-2 rounded-md border text-sm flex items-center gap-1">
              <RotateCcw className="h-4 w-4" /> 重置
            </button>
          </div>
        </header>

        {/* 导入区 */}
        <section className="mt-4">
          <div className="rounded-2xl border p-4 shadow-soft bg-white dark:bg-gh-soft dark:border-gh-border">
            <div className="text-sm font-semibold mb-2">数据导入</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv" ref={fileRef} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); }} className="block w-full text-sm" />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input placeholder="或粘贴 CSV 直链（GitHub Raw / 公网直链）" ref={urlRef} className="flex-1 px-3 py-2 rounded-md border dark:bg-gh-soft dark:border-gh-border"/>
                <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={()=> handleURL(urlRef.current?.value||"")}>
                  <LinkIcon className="h-4 w-4"/> 导入
                </button>
              </div>
              {loading && <div className="md:col-span-3 text-sm text-neutral-500">导入中… {progress}%</div>}
            </div>
          </div>
        </section>

        {/* 工具条 */}
        <section className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input className="w-full px-9 py-2 rounded-md border dark:bg-gh-soft dark:border-gh-border" placeholder="搜索中文/英文/释义/类别/标签…" value={query} onChange={(e)=> setQuery(e.target.value)} />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
            </div>
            <select className="px-3 py-2 rounded-md border dark:bg-gh-soft dark:border-gh-border" value={category} onChange={(e)=> setCategory(e.target.value)}>
              {allCategories.map(c => <option key={c} value={c}>{c==="all"?"全部类别":c}</option>)}
            </select>
            <select className="px-3 py-2 rounded-md border dark:bg-gh-soft dark:border-gh-border" value={tag} onChange={(e)=> setTag(e.target.value)}>
              {allTags.map(t => <option key={t} value={t}>{t==="all"?"全部标签":t}</option>)}
            </select>
            <select className="px-3 py-2 rounded-md border dark:bg-gh-soft dark:border-gh-border" value={sortBy} onChange={(e)=> setSortBy(e.target.value as any)}>
              <option value="alpha">按字母</option>
              <option value="recent">最新导入</option>
              <option value="freq">按频率</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={flashMode} onChange={(e)=> setFlashMode(e.target.checked)} /> 抽认卡模式
            </label>
          </div>
        </section>

        {/* 列表模式 */}
        {!flashMode && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {(filtered.length ? filtered : data).map((v, i) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className={`h-full p-4 rounded-2xl border shadow-soft ${pickPalette(i)} dark:bg-gh-soft dark:border-gh-border`}>
                    {renderFront(v)}
                    <div className="mt-2">{renderBack(v)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}

        {/* 抽认卡模式 */}
        {flashMode && (
          <section className="mt-6">
            <div className="rounded-2xl border p-6 shadow-soft bg-white dark:bg-gh-soft dark:border-gh-border">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-neutral-500">共 {studyList.length} 项 · 第 {studyList.length ? (idx % studyList.length)+1 : 0} / {studyList.length}</div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={()=> setShowBack(s=>!s)}>
                    {showBack ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showBack ? "隐藏背面" : "显示背面"}
                  </button>
                  <button className="px-3 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm" onClick={()=> setIdx(i => (i+1) % Math.max(1, studyList.length))}>
                    <Shuffle className="h-4 w-4" /> 下一张
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
                    <button className="px-3 py-2 rounded-md border text-sm" onClick={prevCard}>上一张</button>
                    <button className="px-3 py-2 rounded-md border text-sm" onClick={nextCard}>下一张</button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-neutral-500">暂无数据</div>
              )}
            </div>
          </section>
        )}

        {/* 说明 */}
        <section className="mt-8">
          <details>
            <summary className="cursor-pointer select-none text-sm flex items-center gap-1"><Info className="h-4 w-4"/> 使用说明 / About</summary>
            <div className="mt-3 space-y-2 text-sm leading-6">
              <p>支持中英文表头的 CSV；至少一侧（中文或英文）标题+释义存在即可显示。</p>
              <p>可用列名示例：zh_title / 中文标题、en_title / 英文标题、zh_def / 中文释义、en_def / 英文释义、category / 类别、tags / 标签、example / 例句、details / 背景、images / 图片、frequency / 频率。</p>
              <p>默认从 <code>/data/vocab.csv</code> 加载；你也可以通过“导入”粘贴直链或上传本地 CSV。</p>
            </div>
          </details>
        </section>

        <footer className="mt-8 py-6 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Vocabulary Viewer 2.0 · 白底低饱和卡片 · GitHub Dark 夜间风格
        </footer>
      </div>
    </div>
  );
}
