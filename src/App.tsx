import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Link as LinkIcon, Search, Moon, Sun, Shuffle, RotateCcw, Eye, EyeOff, Download, Filter } from "lucide-react";
import Papa from "papaparse";

// -----------------------------
// 类型定义与工具函数
// -----------------------------

/** 词条类型 */
type Vocab = {
  id: string;            // 内部ID
  term: string;          // 单词/词条
  definition: string;    // 释义
  pos?: string;          // 词性
  tags?: string[];       // 标签
  example?: string;      // 例句
  frequency?: number;    // 频率或权重
  addedAt?: number;      // 添加时间戳
};

/** 将任意对象尽量映射到 Vocab 结构 */
function normalizeRow(row: Record<string, any>, idx: number): Vocab | null {
  // 容错：支持中英文/不同写法的列名
  const map = (key: string) => {
    const k = key.toLowerCase().trim();
    return (
      row[key] ??
      row[k] ??
      row[
        [
          // term
          "term",
          "单词",
          "词条",
          "word",
          "词语",
          "vocab",
          // definition
          "definition",
          "释义",
          "解释",
          "meaning",
          // pos
          "pos",
          "词性",
          "part_of_speech",
          // tags
          "tags",
          "标签",
          // example
          "example",
          "例句",
          // frequency
          "frequency",
          "freq",
          "权重",
        ].includes(k)
          ? k
          : ""
      ]
    );
  };

  const keys = Object.keys(row);
  const lower = Object.fromEntries(keys.map((k) => [k.toLowerCase().trim(), row[k]]));

  const term = lower["term"] ?? lower["word"] ?? lower["单词"] ?? lower["词条"] ?? lower["vocab"];
  const definition = lower["definition"] ?? lower["meaning"] ?? lower["释义"] ?? lower["解释"];
  const pos = lower["pos"] ?? lower["part_of_speech"] ?? lower["词性"]; 
  const tagsRaw = lower["tags"] ?? lower["标签"]; 
  const example = lower["example"] ?? lower["例句"]; 
  const frequency = Number(lower["frequency"] ?? lower["freq"] ?? lower["权重"] ?? NaN);

  if (!term && !definition) return null;

  return {
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    term: String(term ?? "").trim(),
    definition: String(definition ?? "").trim(),
    pos: pos ? String(pos) : undefined,
    tags: typeof tagsRaw === "string" ? tagsRaw.split(/[;,，、\s]+/).filter(Boolean) : Array.isArray(tagsRaw) ? tagsRaw : undefined,
    example: example ? String(example) : undefined,
    frequency: isFinite(frequency) ? frequency : undefined,
    addedAt: Date.now(),
  };
}

const STORAGE_KEY = "vocab.site.data.v1";
const PREF_KEY = "vocab.site.prefs.v1";

function saveToStorage(vocabs: Vocab[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabs));
}
function loadFromStorage(): Vocab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Vocab[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// -----------------------------
// 示例CSV（用于无数据时演示）
// -----------------------------
const SAMPLE_CSV = `term,definition,pos,tags,example,frequency\nserendipity,意外收获; 机缘巧合,n.,高级;常用,She found the book by pure serendipity.,0.8\nephemeral,转瞬即逝的,adj.,文学;考研,Life is ephemeral like morning dew.,0.6\nmeticulous,一丝不苟的; 极其仔细的,adj.,写作;常用,He keeps meticulous notes.,0.7\nresilient,有韧性的; 能迅速恢复的,adj.,职场;心理,Children are often more resilient than adults.,0.5\npragmatic,务实的,adj.,哲学;常用,We need a pragmatic approach.,0.9\n`;

// -----------------------------
// 主组件
// -----------------------------
export default function App() {
  const [data, setData] = useState<Vocab[]>(loadFromStorage());
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("alpha");
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      return !!saved.dark;
    } catch { return false; }
  });
  const [flashMode, setFlashMode] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const [index, setIndex] = useState(0); // flashcard index
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(PREF_KEY, JSON.stringify({ dark }));
  }, [dark]);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    data.forEach((v) => v.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const allPos = useMemo(() => {
    const s = new Set<string>();
    data.forEach((v) => v.pos && s.add(v.pos));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    let arr = data;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter((v) =>
        [v.term, v.definition, v.example, v.pos, (v.tags || []).join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (pos !== "all") arr = arr.filter((v) => (v.pos || "").toLowerCase() === pos.toLowerCase());
    if (tag !== "all") arr = arr.filter((v) => v.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()));

    const cmp: Record<string, (a: Vocab, b: Vocab) => number> = {
      alpha: (a, b) => a.term.localeCompare(b.term),
      recent: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
      freq: (a, b) => (b.frequency || 0) - (a.frequency || 0),
    };
    return [...arr].sort(cmp[sortBy] || cmp.alpha);
  }, [data, query, pos, tag, sortBy]);

  const flashItems = filtered.length ? filtered : data;
  const current = flashItems[index % Math.max(1, flashItems.length)] || null;

  // -----------------------------
  // 解析 CSV
  // -----------------------------
  const parseCSVText = (text: string) =>
    new Promise<Vocab[]>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data as Record<string, any>[];
          const out: Vocab[] = [];
          rows.forEach((r, i) => {
            const v = normalizeRow(r, i);
            if (v && (v.term || v.definition)) out.push(v);
          });
          resolve(out);
        },
      });
    });

  async function handleFile(file: File) {
    setLoading(true);
    setProgress(10);
    const text = await file.text();
    setProgress(40);
    const out = await parseCSVText(text);
    setProgress(80);
    setData(out);
    setProgress(100);
    setTimeout(() => setLoading(false), 300);
    toast.success(`导入成功：${out.length} 条词汇`);
  }

  async function handleURL(url: string) {
    if (!url) return;
    try {
      setLoading(true);
      setProgress(10);
      const res = await fetch(url);
      setProgress(40);
      const text = await res.text();
      setProgress(70);
      const out = await parseCSVText(text);
      setProgress(95);
      setData(out);
      setProgress(100);
      toast.success(`已从链接导入：${out.length} 条`);
    } catch (e) {
      console.error(e);
      toast.error("从链接导入失败，请检查地址和跨域设置（CORS）");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }

  function loadSample() {
    parseCSVText(SAMPLE_CSV).then((out) => {
      setData(out);
      toast("已载入示例数据，可用于预览样式");
    });
  }

  function exportCSV() {
    const rows = data.map((v) => ({
      term: v.term,
      definition: v.definition,
      pos: v.pos || "",
      tags: (v.tags || []).join(";"),
      example: v.example || "",
      frequency: v.frequency ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocabulary-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setQuery("");
    setPos("all");
    setTag("all");
    setSortBy("alpha");
  }

  function shuffleFlash() {
    setIndex((i) => (i + 1) % Math.max(1, flashItems.length));
    setShowDefinition(false);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 transition-colors">
      <Toaster richColors position="top-center"/>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">词汇表 · Vocabulary</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">导入 CSV 或链接，手机与电脑端自适应展示，支持搜索筛选与抽认卡学习。</p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="切换主题">
                    {dark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>切换明暗主题</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4"/>导出</Button>
            <Button variant="secondary" onClick={resetAll} className="gap-2"><RotateCcw className="h-4 w-4"/>重置筛选</Button>
          </div>
        </header>

        {/* 导入区 */}
        <section className="mt-4">
          <Card className="border-neutral-200/70 dark:border-neutral-800/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4"/>数据导入</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Input type="file" accept=".csv" ref={fileRef} onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}/>
                <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4"/>上传</Button>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Input placeholder="或粘贴 CSV 链接（支持 GitHub Raw / 公网直链）" ref={urlRef}/>
                <Button className="gap-2" onClick={() => handleURL(urlRef.current?.value || "")}><LinkIcon className="h-4 w-4"/>导入</Button>
                <Button variant="ghost" onClick={loadSample}>载入示例</Button>
              </div>
              {loading && (
                <div className="md:col-span-3">
                  <Progress value={progress}/>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 工具条 */}
        <section className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Input placeholder="搜索单词、释义、例句或标签…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9"/>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
            </div>
            <Select value={pos} onValueChange={setPos}>
              <SelectTrigger className="w-36"><SelectValue placeholder="词性"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部词性</SelectItem>
                {allPos.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="w-40"><SelectValue placeholder="标签"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                {allTags.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36"><SelectValue placeholder="排序"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">按字母</SelectItem>
                <SelectItem value="recent">最新导入</SelectItem>
                <SelectItem value="freq">按频率</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="flash" checked={flashMode} onCheckedChange={setFlashMode}/>
              <label htmlFor="flash" className="text-sm text-neutral-600 dark:text-neutral-300">抽认卡模式</label>
            </div>
          </div>
        </section>

        {/* 内容区 */}
        {!flashMode && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {(filtered.length ? filtered : data).map((v) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Card className="h-full border-neutral-200/70 dark:border-neutral-800/70 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-xl">
                        <span>{v.term}</span>
                        {v.pos && <Badge variant="secondary" className="text-xs">{v.pos}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{v.definition}</p>
                      {v.example && (
                        <p className="text-xs italic text-neutral-500 dark:text-neutral-400">“{v.example}”</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(v.tags || []).map((t, i) => (
                          <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => setTag(t)}>
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}

        {flashMode && (
          <section className="mt-6">
            <Card className="border-neutral-200/70 dark:border-neutral-800/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-neutral-500">共 {flashItems.length} 项 · 第 {flashItems.length ? (index % flashItems.length) + 1 : 0} / {flashItems.length}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setShowDefinition((s) => !s)}>
                      {showDefinition ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      {showDefinition ? "隐藏释义" : "显示释义"}
                    </Button>
                    <Button className="gap-2" onClick={shuffleFlash}><Shuffle className="h-4 w-4"/>下一张</Button>
                  </div>
                </div>

                {current ? (
                  <div className="grid gap-4 text-center">
                    <div className="text-3xl font-bold tracking-tight">{current.term}</div>
                    {showDefinition && (
                      <div className="max-w-2xl mx-auto">
                        <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-200">{current.definition}</p>
                        {current.example && (
                          <p className="text-sm italic text-neutral-500 dark:text-neutral-400 mt-2">“{current.example}”</p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-3">
                          {current.pos && <Badge variant="secondary">{current.pos}</Badge>}
                          {(current.tags || []).map((t, i) => (
                            <Badge key={i} variant="outline">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-neutral-500">暂无数据，请导入 CSV 或加载示例。</div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* 说明对话框 */}
        <section className="mt-8">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">使用说明 / About</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>CSV 字段说明 & 使用建议</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-3 text-sm leading-6">
                  <p>支持带表头的 CSV。推荐列：</p>
                  <ul className="list-disc pl-6">
                    <li><code>term</code>（必填）：词条或单词</li>
                    <li><code>definition</code>（必填）：释义（可含多义；建议使用分号分隔）</li>
                    <li><code>pos</code>（可选）：词性，例如 n. / v. / adj.</li>
                    <li><code>tags</code>（可选）：标签，多个用分号、逗号或空格分隔</li>
                    <li><code>example</code>（可选）：例句</li>
                    <li><code>frequency</code>（可选）：0~1 之间或任意数值，用于排序</li>
                  </ul>
                  <p>也兼容常见的中英文列名（如“单词/释义/词性/标签/例句/权重”等）。</p>
                  <p>导入的数据会保存在本地浏览器（localStorage），不上传到服务器。</p>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </section>

        <footer className="mt-8 py-6 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Vocabulary Viewer · 自适应 · 无后端 · 可部署到任意静态空间
        </footer>
      </div>
    </div>
  );
}
