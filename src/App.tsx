
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Papa from "papaparse";
import { Moon, Sun, Shuffle, RotateCcw, Eye, EyeOff, Star, StarOff, Layers, Info, Download, Link as LinkIcon, Search } from "lucide-react";

type Vocab = {
  id: string;
  zhTitle: string;
  enTitle: string;
  zhDef?: string;
  enDef?: string;
  category?: string;
  tags?: string[];
  example?: string;
  details?: string;
  images?: string[];
  initial?: string;
  frequency?: number;
  addedAt?: number;
};

const STORAGE_KEY = "vocab.site.data.v2";
const PREF_KEY = "vocab.site.prefs.v2";
const STAR_KEY = "vocab.site.favs.v2";
const DATA_URL_KEY = "vocab.site.remoteUrl";
const DEFAULT_REMOTE_URL = "/data/vocab.csv";
const urlParams = new URLSearchParams(globalThis.location?.search || "");
const DEFAULT_VIEW_ONLY = urlParams.get("admin") !== "1";

function normalizeRow(row: Record<string, any>, idx: number): Vocab | null {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  const zhTitle = lower["zh_title"] ?? lower["中文标题"] ?? lower["标题"] ?? lower["term_zh"] ?? "";
  const enTitle = lower["en_title"] ?? lower["英文标题"] ?? lower["word"] ?? lower["term_en"] ?? lower["term"] ?? "";
  const zhDef = lower["zh_def"] ?? lower["中文释义"] ?? lower["释义"] ?? lower["meaning_cn"] ?? lower["definition_cn"] ?? lower["定义(中)"] ?? "";
  const enDef = lower["en_def"] ?? lower["英文释义"] ?? lower["definition"] ?? lower["meaning"] ?? lower["定义(英)"] ?? "";
  const category = lower["category"] ?? lower["类别"] ?? lower["class"] ?? lower["type"] ?? "";
  const tagsRaw = lower["tags"] ?? lower["标签"] ?? "";
  const example = lower["example"] ?? lower["例句"] ?? "";
  const details = lower["details"] ?? lower["背景"] ?? lower["备注"] ?? "";
  const imagesRaw = lower["images"] ?? lower["图片"] ?? "";
  const frequency = Number(lower["frequency"] ?? lower["freq"] ?? lower["权重"] ?? NaN);

  if (!zhTitle && !enTitle && !zhDef && !enDef) return null;

  const en = String(enTitle || "").trim();
  const initial = (en[0] || "").toUpperCase();

  return {
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    zhTitle: String(zhTitle || en || "").trim(),
    enTitle: en,
    zhDef: String(zhDef || "").trim(),
    enDef: String(enDef || "").trim(),
    category: String(category || "").trim() || undefined,
    tags: typeof tagsRaw === "string" ? tagsRaw.split(/[;,，、\s]+/).filter(Boolean) : Array.isArray(tagsRaw) ? tagsRaw : undefined,
    example: example ? String(example) : undefined,
    details: details ? String(details) : undefined,
    images: typeof imagesRaw === "string" ? imagesRaw.split(/[;,，\s]+/).filter(Boolean) : Array.isArray(imagesRaw) ? imagesRaw : undefined,
    initial: initial || undefined,
    frequency: isFinite(frequency) ? frequency : undefined,
    addedAt: Date.now(),
  };
}

function saveToStorage(vocabs: Vocab[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabs)); }
function loadFromStorage(): Vocab[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? (JSON.parse(raw) as Vocab[]) : []; } catch { return []; } }
function saveStars(ids: Set<string>) { localStorage.setItem(STAR_KEY, JSON.stringify(Array.from(ids))); }
function loadStars(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]")); } catch { return new Set(); } }

const SAMPLE_CSV = `zh_title,en_title,zh_def,en_def,category,tags,example,images,details,frequency
演绎法,Deduction,从一般到特殊的推理,Reasoning from general to specific,逻辑,哲学;课堂,All men are mortal.,,源自亚里士多德的三段论传统,0.9
归纳法,Induction,由特殊到一般的推理,Generalization from cases to rule,逻辑,哲学;课堂,Swan A/B/C are white...,,与科学方法紧密相关,0.8
`;

const PALETTES = [
  "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800",
  "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800",
  "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800",
  "bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800",
  "bg-violet-50 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800",
  "bg-fuchsia-50 border-fuchsia-100 dark:bg-fuchsia-900/20 dark:border-fuchsia-800",
];
const pickPalette = (i: number) => PALETTES[i % PALETTES.length];

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

export default function App() {
  const [data, setData] = useState<Vocab[]>(loadFromStorage());
  const [dark, setDark] = useState<boolean>(() => { try { return !!JSON.parse(localStorage.getItem(PREF_KEY) || "{}").dark; } catch { return false; } });
  const [viewOnly, setViewOnly] = useState<boolean>(() => DEFAULT_VIEW_ONLY);
  const [remoteUrl, setRemoteUrl] = useState<string>(() => localStorage.getItem(DATA_URL_KEY) || DEFAULT_REMOTE_URL);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [order, setOrder] = useState<"alpha"|"category"|"initial"|"random"|"recent"|"freq">("alpha");
  const [onlyStarred, setOnlyStarred] = useState(false);

  const [studyMode, setStudyMode] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [cursor, setCursor] = useState(0);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const stars = useMemo(() => loadStars(), []);
  const [favIds, setFavIds] = useState<Set<string>>(stars);

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem(PREF_KEY, JSON.stringify({ dark })); }, [dark]);
  useEffect(() => { saveToStorage(data); }, [data]);
  useEffect(() => { saveStars(favIds); }, [favIds]);

  useEffect(() => {
    (async () => {
      if (data.length) return;
      try {
        setLoading(true); setProgress(15);
        const res = await fetch(remoteUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("remote fetch fail");
        setProgress(40);
        const text = await res.text(); setProgress(70);
        const out = await parseCSVText(text); setProgress(95);
        if (out.length) { setData(out); toast.success(`已从固定数据源载入：${out.length} 条`); }
        else throw new Error("empty");
      } catch {
        const out = await parseCSVText(SAMPLE_CSV); setData(out);
        toast("未找到固定数据源，已载入示例数据");
      } finally { setTimeout(() => setLoading(false), 300); setProgress(100); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCategories = useMemo(() => {
    const s = new Set<string>(); data.forEach(v => v.category && s.add(v.category));
    return ["all", ...Array.from(s).sort((a,b)=>a.localeCompare(b))];
  }, [data]);

  const filtered = useMemo(() => {
    let arr = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(v => [v.zhTitle, v.enTitle, v.zhDef, v.enDef, v.category, v.example, (v.tags||[]).join(" ")]
        .filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    if (category !== "all") arr = arr.filter(v => (v.category||"") === category);
    if (onlyStarred) arr = arr.filter(v => favIds.has(v.id));

    let out = [...arr];
    if (order === "alpha") out.sort((a,b)=> (a.enTitle||a.zhTitle).localeCompare(b.enTitle||b.zhTitle));
    if (order === "initial") out.sort((a,b)=> (a.initial||"~").localeCompare(b.initial||"~") || (a.enTitle||a.zhTitle).localeCompare(b.enTitle||b.zhTitle));
    if (order === "category") out.sort((a,b)=> (a.category||"~").localeCompare(b.category||"~") || (a.enTitle||a.zhTitle).localeCompare(b.enTitle||b.zhTitle));
    if (order === "recent") out.sort((a,b)=> (b.addedAt||0) - (a.addedAt||0));
    if (order === "freq") out.sort((a,b)=> (b.frequency||0) - (a.frequency||0));
    if (order === "random") out.sort(()=> Math.random() - 0.5);
    return out;
  }, [data, query, category, onlyStarred, favIds, order]);

  const studyList = filtered.length ? filtered : data;
  const current = studyList[cursor % Math.max(1, studyList.length)] || null;

  async function handleFile(file: File) {
    setLoading(true); setProgress(10);
    const text = await file.text(); setProgress(40);
    const out = await parseCSVText(text); setProgress(80);
    setData(out); setProgress(100); setTimeout(()=>setLoading(false),300);
    toast.success(`导入成功：${out.length} 条词汇`);
  }
  async function handleURL(url: string) {
    if (!url) return;
    try { setLoading(true); setProgress(10);
      const res = await fetch(url); setProgress(40);
      const text = await res.text(); setProgress(70);
      const out = await parseCSVText(text); setProgress(95);
      setData(out); setProgress(100); toast.success(`已从链接导入：${out.length} 条`);
    } catch (e) { console.error(e); toast.error("从链接导入失败，请检查地址与 CORS"); }
    finally { setTimeout(()=>setLoading(false),300); }
  }
  function setFixedRemote(url: string) {
    localStorage.setItem(DATA_URL_KEY, url); 
    toast.success("已设置固定数据源（刷新后生效）。");
  }
  function exportCSV() {
    const rows = data.map(v => ({
      zh_title: v.zhTitle, en_title: v.enTitle, zh_def: v.zhDef||"", en_def: v.enDef||"",
      category: v.category||"", tags: (v.tags||[]).join(";"), example: v.example||"",
      images: (v.images||[]).join(";"), details: v.details||"", frequency: v.frequency??""
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "vocabulary-export.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  function toggleStar(id: string) {
    setFavIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function resetFilters() {
    setQuery(""); setCategory("all"); setOrder("alpha"); setOnlyStarred(false);
  }
  function nextCard() { setCursor(c => (c + 1) % Math.max(1, studyList.length)); setShowBack(false); }
  function prevCard() { setCursor(c => (c - 1 + Math.max(1, studyList.length)) % Math.max(1, studyList.length)); setShowBack(false); }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              词汇表 · Vocabulary
              <span className="text-xs rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 px-2 py-0.5">只读：{viewOnly ? "开" : "关"}</span>
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">发布网址即可查看；支持搜索、分类、乱序、星标、单卡背诵、详情与图片。</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60" title="切换明/暗" onClick={()=> setDark(d=>!d)}>
              {dark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
            </button>

            {!viewOnly && (
              <>
                <button onClick={exportCSV} className="px-3 py-2 rounded-md border border-neutral-300/70 dark:border-neutral-700/70 text-sm flex items-center gap-1">
                  <Download className="h-4 w-4" /> 导出
                </button>
                <details className="relative">
                  <summary className="px-3 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm cursor-pointer select-none">管理</summary>
                  <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xl">
                    <div className="text-sm text-neutral-500 mb-2">设置固定 CSV 数据源 URL（学生只读加载）：</div>
                    <div className="flex gap-2">
                      <input placeholder="https://.../vocab.csv" className="flex-1 px-2 py-1 rounded-md border dark:bg-neutral-950" ref={urlInputRef} defaultValue={remoteUrl} />
                      <button className="px-2 py-1 rounded-md bg-blue-600 text-white text-sm" onClick={()=>{ const v=urlInputRef.current?.value?.trim(); if(v){ setFixedRemote(v); } }}>保存</button>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">建议将 CSV 放到 /public/data/vocab.csv 并部署。</div>
                    <hr className="my-3 border-neutral-200 dark:border-neutral-800" />
                    <div className="text-sm mb-1">（可选）本地导入预览：</div>
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".csv" ref={fileRef} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); }} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input placeholder="或粘贴 CSV 链接" className="flex-1 px-2 py-1 rounded-md border dark:bg-neutral-950" />
                      <button className="px-2 py-1 rounded-md border" onClick={(e)=>{
                        const parent = (e.currentTarget.parentElement)!;
                        const input = parent.querySelector("input") as HTMLInputElement;
                        handleURL(input?.value || "");
                      }}><LinkIcon className="h-4 w-4 inline"/> 导入</button>
                      <button className="px-2 py-1 rounded-md" onClick={async()=>{ const out=await parseCSVText(SAMPLE_CSV); setData(out); toast("已载入示例"); }}>示例</button>
                    </div>
                  </div>
                </details>
              </>
            )}

            <button className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60" title="切换只读/管理" onClick={()=> setViewOnly(v=>!v)}>
              <Layers className="h-5 w-5"/>
            </button>
          </div>
        </header>

        {/* 工具条 */}
        <section className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input className="w-full px-9 py-2 rounded-md border dark:bg-neutral-950" placeholder="搜索中文/英文/释义/标签/类别…" value={query} onChange={(e)=>setQuery(e.target.value)} />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
            </div>
            <select className="px-3 py-2 rounded-md border dark:bg-neutral-950" value={category} onChange={(e)=> setCategory(e.target.value)}>
              {allCategories.map(c => <option key={c} value={c}>{c === "all" ? "全部类别" : c}</option>)}
            </select>
            <select className="px-3 py-2 rounded-md border dark:bg-neutral-950" value={order} onChange={(e)=> setOrder(e.target.value as any)}>
              <option value="alpha">按字母</option>
              <option value="initial">按首字母</option>
              <option value="category">按类别</option>
              <option value="recent">最新导入</option>
              <option value="freq">按频率</option>
              <option value="random">乱序</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyStarred} onChange={(e)=> setOnlyStarred(e.target.checked)} /> 仅星标
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={studyMode} onChange={(e)=> setStudyMode(e.target.checked)} /> 单卡背诵
            </label>
            <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={resetFilters}><RotateCcw className="h-4 w-4"/> 重置</button>
          </div>
        </section>

        {/* 列表模式 */}
        {!studyMode && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filtered.map((v, i) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>
                  <div className={`h-full border rounded-2xl p-4 hover:shadow-md transition-shadow ${pickPalette(i)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold text-lg">{v.zhTitle}</div>
                        <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">{v.enTitle}</div>
                      </div>
                      <button className="p-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60" onClick={()=>toggleStar(v.id)} title="收藏">
                        {favIds.has(v.id) ? <Star className="h-5 w-5"/> : <StarOff className="h-5 w-5"/>}
                      </button>
                    </div>
                    {(v.zhDef || v.enDef) && <p className="text-sm leading-relaxed mt-3">{v.zhDef || v.enDef}</p>}
                    {v.zhDef && v.enDef && <p className="text-xs text-neutral-500 dark:text-neutral-400">{v.enDef}</p>}
                    {v.example && <p className="text-xs italic text-neutral-500 dark:text-neutral-400 mt-1">“{v.example}”</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {v.category && (
                        <span onClick={()=> setCategory(v.category!)} className="cursor-pointer px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 text-xs">{v.category}</span>
                      )}
                      {(v.tags || []).map((t, j) => (
                        <span key={j} onClick={()=> setQuery(t)} className="cursor-pointer px-2 py-0.5 rounded-full border text-xs">{t}</span>
                      ))}
                    </div>

                    {/* 详情/翻面 */}
                    <details className="mt-3">
                      <summary className="cursor-pointer select-none text-sm">点击详情 / 翻面</summary>
                      <div className="mt-2 space-y-2">
                        {(v.images && v.images.length>0) && (
                          <div className="flex gap-2 overflow-auto">
                            {v.images.map((src, k)=> (
                              <img key={k} src={src} alt="" className="h-24 w-36 object-cover rounded-xl shadow-sm"/>
                            ))}
                          </div>
                        )}
                        {(v.zhDef || v.enDef) && (
                          <div className="text-neutral-700 dark:text-neutral-200 text-sm">
                            {v.zhDef && <p>📘 {v.zhDef}</p>}
                            {v.enDef && <p className="text-xs text-neutral-500">{v.enDef}</p>}
                          </div>
                        )}
                        {v.details && <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap text-sm">{v.details}</p>}
                      </div>
                    </details>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}

        {/* 单卡背诵模式 */}
        {studyMode && (
          <section className="mt-6">
            <div className="border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-neutral-500">共 {studyList.length} 项 · 第 {studyList.length ? (cursor % studyList.length)+1 : 0} / {studyList.length}</div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-1" onClick={()=> setShowBack(s=>!s)}>
                    {showBack ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    {showBack ? "隐藏背面" : "显示背面"}
                  </button>
                  <button className="px-3 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm flex items-center gap-1" onClick={()=> setOrder("random") }>
                    <Shuffle className="h-4 w-4"/> 乱序
                  </button>
                </div>
              </div>

              {current ? (
                <motion.div key={current.id + String(showBack)} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.35 }} className="grid gap-4 text-center select-none">
                  {!showBack ? (
                    <div className="space-y-2">
                      <div className="text-3xl font-bold tracking-tight">{current.zhTitle}</div>
                      <div className="text-sm text-neutral-500">{current.enTitle}</div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-2">
                      {(current.zhDef || current.enDef) && <p className="text-lg leading-relaxed">{current.zhDef}</p>}
                      {current.enDef && <p className="text-sm text-neutral-500 dark:text-neutral-400">{current.enDef}</p>}
                      {current.example && <p className="text-sm italic text-neutral-500 dark:text-neutral-400 mt-2">“{current.example}”</p>}
                      <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                        {current.category && <span className="px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 text-xs">{current.category}</span>}
                        {(current.tags||[]).map((t,i)=>(<span key={i} className="px-2 py-0.5 rounded-full border text-xs">{t}</span>))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button className="px-3 py-2 rounded-md border text-sm" onClick={prevCard}>上一张</button>
                    <button className="px-3 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm" onClick={()=>{ setShowBack(false); nextCard(); }}>下一张</button>
                    <button className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60" onClick={()=> current && toggleStar(current.id)} title="收藏">
                      {current && (favIds.has(current.id) ? <Star className="h-5 w-5"/> : <StarOff className="h-5 w-5"/>)}
                    </button>
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
              <p>CSV 表头（中英文兼容）：</p>
              <ul className="list-disc pl-6">
                <li><code>zh_title</code>（中文标题） / <code>en_title</code>（英文标题）至少填一个</li>
                <li><code>zh_def</code> / <code>en_def</code>（释义）</li>
                <li><code>category</code>（类别）、<code>tags</code>（标签；分号/逗号/空格分隔）</li>
                <li><code>example</code>（例句）、<code>images</code>（图片URL；分号分隔）</li>
                <li><code>details</code>（背景文本，可 Markdown）、<code>frequency</code>（排序权重）</li>
              </ul>
              <p>只读：默认从固定 URL 加载（部署时放 <code>public/data/vocab.csv</code>）。</p>
              <p>管理：在网址后加 <code>?admin=1</code> 或点击右上角图标切换；设置“固定数据源 URL”仅存本地。</p>
              <p>隐私：数据只存 localStorage，无后端。</p>
            </div>
          </details>
        </section>

        <footer className="mt-8 py-6 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Vocabulary Viewer · 低饱和彩色卡片 · 轻松教学 · 移动端友好
        </footer>
      </div>
    </div>
  );
}
