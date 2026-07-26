"use client";

import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { TrendAnalysisPanel } from "@/components/trend-analysis-panel";
import type { TopicCandidate, TrendAnalysisResult } from "@/lib/analysis/types";
import type { LoginStatus, SearchResult } from "@/lib/research/types";

type AnalysisStatus = "idle" | "searching" | "importing" | "analyzing";

type ResearchLibraryProps = {
  onUseTopic?: (topic: TopicCandidate, result: TrendAnalysisResult) => void;
};

export function ResearchLibrary({ onUseTopic }: ResearchLibraryProps = {}) {
  const [status, setStatus] = useState<LoginStatus>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysis, setAnalysis] = useState<TrendAnalysisResult>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const realSearchAvailable = Boolean(status?.available && status.loggedIn);
  const busy = analysisStatus !== "idle";

  useEffect(() => {
    void fetch("/api/research/status", { cache: "no-store" })
      .then(response => response.json())
      .then(payload => payload.success && setStatus(payload.data))
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
        body: JSON.stringify({ query, limit: 10 }),
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

  const importSelected = async () => {
    const chosen = results.filter(result => selected.has(result.id));
    if (!chosen.length || !window.confirm(`确认将选中的 ${chosen.length} 条研究结果加入本地知识库？`)) return;
    setAnalysisStatus("importing");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/research/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, selected: chosen, userTags: [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "入库失败。");
      const imported = payload.data.importedIds.length;
      const duplicates = payload.data.duplicateIds.length;
      setMessage(`已入库 ${imported} 条${duplicates ? `，跳过重复 ${duplicates} 条` : ""}。Mock 条目以草稿保存并降低 RAG 权重。`);
      setSelected(new Set());
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "入库失败。");
    } finally {
      setAnalysisStatus("idle");
    }
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
        <div><p className="fine">Read-only research</p><h2 className="mt-1 font-bold">Research Beta</h2><p className="mt-1 text-sm text-[var(--muted)]">仅在你点击搜索后查询；结果需勾选并确认才会进入知识库。</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${realSearchAvailable ? "bg-green-100 text-green-800" : "bg-[var(--almond)] text-[var(--ink)]"}`}>{realSearchAvailable ? "Beta：真实只读 CLI 可用" : "Beta：Demo/Mock 回退"}</span>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--rose)]/35 bg-[var(--rose)]/10 px-4 py-3">
        <p className="text-sm font-bold text-[var(--rose-deep)]">Phase 3D / Research：Beta</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{realSearchAvailable ? "Beta：当前可以主动使用真实只读 CLI 搜索，结果需要人工确认后才能入库。" : "Beta：真实搜索当前不可用，已明确回退为 Demo/Mock，不代表真实平台数据。"}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{status?.safeMessage ?? "正在检查 CLI 状态…"}</p>
      <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5"><Search size={16}/><input required maxLength={80} value={query} onChange={event => setQuery(event.target.value)} placeholder="输入关键词后手动搜索" className="w-full bg-transparent text-sm outline-none"/></label>
        <button disabled={busy || !query.trim()} className="primary-button disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "searching" ? "搜索中…" : "搜索"}</button>
      </form>
    </div>
    {(error || message) && <p role={error ? "alert" : "status"} className={`mx-5 mb-4 rounded-xl px-4 py-2 text-sm sm:mx-6 ${error ? "bg-[var(--rose)]/25 text-[var(--rose-deep)]" : "bg-[var(--cream)] text-[var(--muted)]"}`}>{error || message}</p>}
    {results.length > 0 && <div className="border-t border-[var(--line)]">
      <div className="divide-y divide-[var(--line)]">{results.map(result => <label key={result.id} className="flex cursor-pointer gap-3 p-5 sm:px-6">
        <input type="checkbox" checked={selected.has(result.id)} onChange={() => toggle(result.id)} className="mt-1 h-4 w-4 accent-[var(--ink)]"/>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2"><strong className="text-sm">{result.title}</strong><span className="rounded-full bg-[var(--almond)] px-2 py-0.5 text-[10px] font-bold">{result.isMock ? "DEMO / MOCK" : "真实来源"}</span></span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{result.summary}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">{result.author && <span>作者：{result.author}</span>}{result.publishedAt && <span>发布：{result.publishedAt}</span>}<a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">来源 <ExternalLink size={11}/></a></span>
        </span>
      </label>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] p-5 sm:px-6">
        <span className="text-xs text-[var(--muted)]">已选择 {selected.size} 条</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || selected.size === 0} onClick={analyzeTrends} className="rounded-full border border-[var(--ink)] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "analyzing" ? "分析中…" : "分析趋势"}</button>
          <button type="button" disabled={busy || selected.size === 0} onClick={importSelected} className="primary-button disabled:cursor-not-allowed disabled:opacity-45">{analysisStatus === "importing" ? "入库中…" : "加入知识库"}</button>
        </div>
      </div>
      {analysis && <TrendAnalysisPanel result={analysis} onUseTopic={onUseTopic}/>}
    </div>}
  </section>;
}
