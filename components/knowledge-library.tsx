"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookPlus, ExternalLink, X } from "lucide-react";
import type { KnowledgeItem } from "@/lib/knowledge/types";

const emptyForm = { title: "", content: "", tags: "", sourceUrl: "" };

export function KnowledgeLibrary() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge", { cache: "no-store" });
      const payload = await response.json();
      if (payload.success) setItems(payload.data);
    } catch {
      setError("本地知识库暂时不可用。");
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("creatorflow:knowledge-updated", load);
    return () => window.removeEventListener("creatorflow:knowledge-updated", load);
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          sourceType: form.sourceUrl ? "article" : "manual",
          sourceUrl: form.sourceUrl || undefined,
          tags: form.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
          contentType: "reference",
          qualityStatus: "approved",
          authenticityStatus: form.sourceUrl ? "unverified" : "verified",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "保存失败。");
      setForm(emptyForm);
      setOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  };

  return <section className="panel mt-7 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
      <div><p className="fine">Local RAG knowledge</p><h2 className="mt-1 font-bold">简化内容知识库</h2><p className="mt-1 text-sm text-[var(--muted)]">{items.length} 条本地知识会参与关键词与标签检索</p></div>
      <button onClick={() => setOpen(value => !value)} className="primary-button flex items-center gap-2 text-sm">{open ? <X size={16}/> : <BookPlus size={16}/>} {open ? "取消" : "手动入库"}</button>
    </div>
    {error && <p role="alert" className="mx-5 mb-4 rounded-xl bg-[var(--rose)]/25 px-4 py-2 text-sm text-[var(--rose-deep)]">{error}</p>}
    {open && <form onSubmit={submit} className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-2 sm:p-6">
      <label className="text-xs font-bold text-[var(--muted)]">标题<input required maxLength={200} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)]">来源链接（可选）<input type="url" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)] sm:col-span-2">内容<textarea required maxLength={50000} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)]">标签（逗号分隔）<input value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <div className="flex items-end justify-end"><button disabled={saving} className="primary-button min-w-28">{saving ? "保存中…" : "保存条目"}</button></div>
    </form>}
    {!open && items.length > 0 && <div className="flex gap-3 overflow-x-auto border-t border-[var(--line)] p-5 sm:px-6">{items.slice(0, 8).map(item => <article key={item.id} className="min-w-64 max-w-72 rounded-2xl bg-[var(--cream)] p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold">{item.title}</h3>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`打开来源：${item.title}`}><ExternalLink size={14}/></a>}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{item.content}</p><div className="mt-3 flex flex-wrap gap-1">{item.tags.slice(0, 4).map(tag => <span key={tag} className="rounded-full bg-[var(--almond)] px-2 py-1 text-[10px]">{tag}</span>)}</div></article>)}</div>}
  </section>;
}
