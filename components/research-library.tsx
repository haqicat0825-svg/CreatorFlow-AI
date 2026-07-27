"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, ExternalLink, Search, Terminal } from "lucide-react";
import { TrendAnalysisPanel } from "@/components/trend-analysis-panel";
import type { TopicCandidate, TrendAnalysisResult } from "@/lib/analysis/types";
import type { LoginStatus, SearchResult } from "@/lib/research/types";
import type { SelectableResearchProvider } from "@/lib/research/factory";

type AnalysisStatus = "idle" | "searching" | "importing" | "analyzing";

type ResearchLibraryProps = {
  onUseTopic?: (topic: TopicCandidate, result: TrendAnalysisResult) => void;
};

export function ResearchLibrary({ onUseTopic }: ResearchLibraryProps = {}) {
  const [source, setSource] = useState<SelectableResearchProvider>("xiaohongshu-cli");
  const [statuses, setStatuses] = useState<Partial<Record<SelectableResearchProvider, LoginStatus>>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hotContentIds, setHotContentIds] = useState<Set<string>>(new Set());
  const [knowledgeIds, setKnowledgeIds] = useState<Set<string>>(new Set());
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysis, setAnalysis] = useState<TrendAnalysisResult>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const status = statuses[source];
  const realSearchAvailable = Boolean(status?.available && status.loggedIn);
  const busy = analysisStatus !== "idle";

  useEffect(() => {
    void Promise.all((["xiaohongshu-cli", "tavily"] as const).map(async provider => {
      const response = await fetch(`/api/research/status?source=${provider}`, { cache: "no-store" });
      const payload = await response.json();
      return [provider, payload.success ? payload.data : undefined] as const;
    }))
      .then(entries => setStatuses(Object.fromEntries(entries)))
      .catch(() => setError("无法读取研究服务状态。"));
  }, []);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setAnalysisStatus("searching");
    setAnalysis(undefined);
    setError("");
    setMessage("");
    setSelected(new Set());
    try {
      const response = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10, source }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "搜索失败。");
      setResults(payload.data);
      if (!payload.data.length) setMessage("没有找到结果。");
    } catch (cause) {
      setResults([]);
      setError(cause instanceof Error ? cause.message : "搜索失败。");
    } finally {
      setAnalysisStatus("idle");
    }
  };

  const importResults = async (chosen: SearchResult[], destination: "hot-content" | "content-knowledge") => {
    if (!chosen.length) return;
    setAnalysisStatus("importing");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/research/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, selected: chosen, userTags: [], destination }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "入库失败。");
      const imported = payload.data.importedIds.length;
      const duplicates = payload.data.duplicateIds.length;
      const destinationLabel = destination === "hot-content" ? "爆款案例库" : "内容知识库";
      setMessage(`已加入${destinationLabel} ${imported} 条${duplicates ? `，已有 ${duplicates} 条未重复保存` : ""}。`);
      const setter = destination === "hot-content" ? setHotContentIds : setKnowledgeIds;
      setter(previous => new Set([...previous, ...chosen.map(item => item.id)]));
      setSelected(new Set());
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "入库失败。");
    } finally {
      setAnalysisStatus("idle");
    }
  };

  const importSelected = async (destination: "hot-content" | "content-knowledge") => {
    const chosen = results.filter(result => selected.has(result.id));
    const label = destination === "hot-content" ? "爆款案例库" : "内容知识库";
    if (!chosen.length || !window.confirm(`确认将选中的 ${chosen.length} 条研究结果加入${label}？`)) return;
    await importResults(chosen, destination);
  };

  const toggle = (id: string) => {
    setAnalysis(undefined);
    setSelected(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const analyzeTrends = async () => {
    const selectedResults = results.filter(result => selected.has(result.id));
    if (!selectedResults.length) return;
    setAnalysisStatus("analyzing");
    setAnalysis(undefined);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, selectedResults }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "趋势分析失败。");
      setAnalysis(payload.data);
    } catch (cause) {
      setAnalysis(undefined);
      setError(cause instanceof Error ? cause.message : "趋势分析失败。");
    } finally {
      setAnalysisStatus("idle");
    }
  };

  return <section className="panel mt-7 overflow-hidden">
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="fine">Read-only research</p><h2 className="mt-1 font-bold">Research Beta</h2><p className="mt-1 text-sm text-[var(--muted)]">选择 Research Source；搜索结果仅在你明确操作后进入对应资料库。</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${realSearchAvailable ? "bg-green-100 text-green-800" : "bg-[var(--almond)] text-[var(--ink)]"}`}>{realSearchAvailable ? "Research Source 可用" : "当前来源不可用"}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Research Source">
        <button type="button" aria-pressed={source === "xiaohongshu-cli"} onClick={() => { setSource("xiaohongshu-cli"); setResults([]); setAnalysis(undefined); }} className={`rounded-2xl border p-4 text-left ${source === "xiaohongshu-cli" ? "border-[var(--rose)] bg-[var(--rose)]/15" : "border-[var(--line)] bg-white/60"}`}>
          <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold"><Terminal size={16}/>Xiaohongshu CLI</span><span className="text-[10px] font-bold text-[var(--muted)]">{statuses["xiaohongshu-cli"]?.available && statuses["xiaohongshu-cli"]?.loggedIn ? "已连接" : "未连接"}</span></span>
          <span className="mt-2 block text-xs text-[var(--muted)]">真实只读搜索 · 用于爆款案例采集</span>
        </button>
        <button type="button" aria-pressed={source === "tavily"} onClick={() => { setSource("tavily"); setResults([]); setAnalysis(undefined); }} className={`rounded-2xl border p-4 text-left ${source === "tavily" ? "border-[var(--rose)] bg-[var(--rose)]/15" : "border-[var(--line)] bg-white/60"}`}>
          <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold"><Database size={16}/>Tavily Search</span><span className="text-[10px] font-bold text-[var(--muted)]">{statuses.tavily?.available ? "API已配置" : "API未配置"}</span></span>
          <span className="mt-2 block text-xs text-[var(--muted)]">网页趋势搜索 · 用于趋势搜索</span>
        </button>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--rose)]/35 bg-[var(--rose)]/10 px-4 py-3">
        <p className="text-sm font-bold text-[var(--rose-deep)]">Phase 3D / Research：Beta</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{source === "xiaohongshu-cli" ? realSearchAvailable ? "Xiaohongshu CLI 已连接：真实只读搜索，结果需人工确认后保存。" : "Xiaohongshu CLI 当前未连接；搜索可能回退为明确标识的 Demo/Mock。" : realSearchAvailable ? "Tavily Search API 已配置：用于检索网页趋势信息。" : "Tavily Search API 尚未配置，当前不会发起真实搜索。"}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{status?.safeMessage ?? "正在检查 CLI 状态…"}</p>
      <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5"><Search size={16}/><input required maxLength={80} value={query} onChange={event => setQuery(event.target.value)} placeholder="输入关键词后手动搜索" className="w-full bg-transparent text-sm outline-none"/></label>
        <button disabled={busy || !query.trim()} className="primary-button disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "searching" ? "搜索中…" : "搜索"}</button>
      </form>
    </div>
    {(error || message) && <p role={error ? "alert" : "status"} className={`mx-5 mb-4 rounded-xl px-4 py-2 text-sm sm:mx-6 ${error ? "bg-[var(--rose)]/25 text-[var(--rose-deep)]" : "bg-[var(--cream)] text-[var(--muted)]"}`}>{error || message}</p>}
    {results.length > 0 && <div className="border-t border-[var(--line)]">
      <div className="divide-y divide-[var(--line)]">{results.map(result => <div key={result.id} className="flex gap-3 p-5 sm:px-6">
        <input aria-label={`选择研究结果：${result.title}`} type="checkbox" checked={selected.has(result.id)} onChange={() => toggle(result.id)} className="mt-1 h-4 w-4 accent-[var(--ink)]"/>
        <span className="flex min-w-0 flex-1 gap-4">
          {result.coverImage && <img src={result.coverImage} alt={`${result.title}封面`} loading="lazy" referrerPolicy="no-referrer" className="h-28 w-24 shrink-0 rounded-xl bg-[var(--cream)] object-cover sm:h-32 sm:w-28"/>}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2"><strong className="text-sm">{result.title}</strong><span className="rounded-full bg-[var(--almond)] px-2 py-0.5 text-[10px] font-bold">{result.isMock ? "DEMO / MOCK" : result.source === "xiaohongshu" ? "小红书 · 真实来源" : "Tavily · 网页来源"}</span></span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{result.summary}</span>
            <span className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
              {result.author && <span>作者：{result.author}</span>}
              {result.likes !== undefined && <span>点赞 {result.likes.toLocaleString()}</span>}
              {result.saves !== undefined && <span>收藏 {result.saves.toLocaleString()}</span>}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">{result.publishedAt && <span>发布：{result.publishedAt}</span>}<span>来源：{result.source === "xiaohongshu" ? "小红书" : "Tavily"}</span><a href={result.url ?? result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">查看原文 <ExternalLink size={11}/></a></span>
            <span className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy || result.source !== "xiaohongshu" || hotContentIds.has(result.id)} title={result.source !== "xiaohongshu" ? "爆款案例库仅保存小红书案例" : undefined} onClick={() => void importResults([result], "hot-content")} className="soft-button text-xs disabled:cursor-not-allowed disabled:opacity-60">{hotContentIds.has(result.id) ? "已加入爆款案例库" : "加入爆款案例库"}</button>
              <button type="button" disabled={busy || knowledgeIds.has(result.id)} onClick={() => void importResults([result], "content-knowledge")} className="soft-button text-xs disabled:cursor-not-allowed disabled:opacity-60">{knowledgeIds.has(result.id) ? "已加入知识库" : "加入知识库"}</button>
            </span>
          </span>
        </span>
      </div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] p-5 sm:px-6">
        <span className="text-xs text-[var(--muted)]">已选择 {selected.size} 条</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || selected.size === 0} onClick={analyzeTrends} className="rounded-full border border-[var(--ink)] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "analyzing" ? "分析中…" : "分析趋势"}</button>
          <button type="button" disabled={busy || selected.size === 0 || results.filter(result => selected.has(result.id)).some(result => result.source !== "xiaohongshu")} onClick={() => void importSelected("hot-content")} className="soft-button disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "importing" ? "入库中…" : "加入爆款案例库"}</button>
          <button type="button" disabled={busy || selected.size === 0} onClick={() => void importSelected("content-knowledge")} className="primary-button disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "importing" ? "入库中…" : "加入知识库"}</button>
        </div>
      </div>
      {analysis && <TrendAnalysisPanel result={analysis} onUseTopic={onUseTopic}/>}
    </div>}
  </section>;
}
