"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookPlus, Bookmark, Check, ExternalLink, Heart, ImageIcon, Trash2, X } from "lucide-react";
import type { KnowledgeCategory, KnowledgeItem } from "@/lib/knowledge/types";
import { loadSelectedCover, saveSelectedCover } from "@/lib/content/selected-cover";

const emptyForm = { title: "", content: "", tags: "", sourceUrl: "", category: "content_knowledge" as KnowledgeCategory };
const categories: { value: KnowledgeCategory; label: string }[] = [
  { value: "content_knowledge", label: "Content Knowledge" },
  { value: "xiaohongshu_case", label: "Hot Content Library" },
  { value: "style_preference", label: "个人审美风格库" },
  { value: "title_template", label: "爆款标题模板库" },
  { value: "ai_image", label: "AI图片库" },
];

export function KnowledgeLibrary({ category, query = "" }: { category?: KnowledgeCategory; query?: string }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [currentCoverId, setCurrentCoverId] = useState("");
  const visibleItems = items.filter(item => (
    (!category || item.category === category)
    && `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
  ));

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge", { cache: "no-store" });
      const payload = await response.json();
      if (payload.success) {
        setItems(payload.data);
        const currentIds = new Set<string>(payload.data.map((item: KnowledgeItem) => item.id));
        setSelectedIds(previous => new Set([...previous].filter(id => currentIds.has(id))));
      }
    } catch {
      setError("本地知识库暂时不可用。");
    }
  }, []);

  useEffect(() => {
    setCurrentCoverId(loadSelectedCover(window.localStorage)?.imageId ?? "");
    void load();
    window.addEventListener("creatorflow:knowledge-updated", load);
    return () => window.removeEventListener("creatorflow:knowledge-updated", load);
  }, [load]);

  const useAsCover = (item: KnowledgeItem, imageUrl: string) => {
    const selected = saveSelectedCover(window.localStorage, {
      imageUrl,
      imageId: item.id,
      source: "library",
      prompt: item.prompt,
      model: item.model,
      provider: item.provider,
    });
    setCurrentCoverId(selected.imageId);
  };

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
          category: form.category,
          content: form.content,
          sourceType: form.sourceUrl ? "article" : "manual",
          sourceUrl: form.sourceUrl || undefined,
          tags: form.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
          contentType: form.category === "style_preference" ? "style-guide" : form.category === "title_template" ? "title-formula" : "reference",
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

  const remove = async (ids: string[]) => {
    if (ids.length === 0 || !window.confirm(`只从 Local RAG Knowledge 删除 ${ids.length} 条记录？原始爆款案例不会受影响。`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "删除失败。");
      setSelectedIds(new Set());
      await load();
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除失败。");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelected = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const changeCategory = async (id: string, category: KnowledgeCategory) => {
    setError("");
    try {
      const response = await fetch(`/api/knowledge/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "修改分类失败。");
      await load();
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "修改分类失败。");
    }
  };

  return <section className="panel mt-7 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
      <div><p className="fine">Local RAG knowledge</p><h2 className="mt-1 font-bold">简化内容知识库</h2><p className="mt-1 text-sm text-[var(--muted)]">{items.length} 条本地知识会参与关键词与标签检索</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && <button disabled={deleting} onClick={() => void remove([...selectedIds])} className="soft-button flex items-center gap-2 text-sm"><Trash2 size={15}/>删除已选（{selectedIds.size}）</button>}
        <button onClick={() => setOpen(value => !value)} className="primary-button flex items-center gap-2 text-sm">{open ? <X size={16}/> : <BookPlus size={16}/>} {open ? "取消" : "手动入库"}</button>
      </div>
    </div>
    {error && <p role="alert" className="mx-5 mb-4 rounded-xl bg-[var(--rose)]/25 px-4 py-2 text-sm text-[var(--rose-deep)]">{error}</p>}
    {open && <form onSubmit={submit} className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-2 sm:p-6">
      <label className="text-xs font-bold text-[var(--muted)]">标题<input required maxLength={200} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)]">来源链接（可选）<input type="url" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)] sm:col-span-2">内容<textarea required maxLength={50000} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)]">标签（逗号分隔）<input value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      <label className="text-xs font-bold text-[var(--muted)]">分类<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as KnowledgeCategory })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none">{categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
      <div className="flex items-end justify-end"><button disabled={saving} className="primary-button min-w-28">{saving ? "保存中…" : "保存条目"}</button></div>
    </form>}
    {!open && visibleItems.length > 0 && <div className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">{visibleItems.map(item => {
      const coverImage = item.imageUrl ?? item.coverImage ?? item.research?.coverImage ?? item.images?.[0] ?? item.research?.images?.[0];
      const likes = item.likes ?? item.research?.likes ?? item.research?.metrics?.likes;
      const saves = item.saves ?? item.research?.saves ?? item.research?.metrics?.saves;
      const sourceLabel = item.category === "ai_image"
        ? item.provider === "generated" ? "AI生成" : item.provider === "library" ? "图片库" : item.provider === "upload" ? "上传" : "AI图片库"
        : item.sourceType === "xiaohongshu" || item.research?.platform === "xiaohongshu" ? "小红书"
        : item.sourceType === "manual" ? "手动入库"
        : "外部来源";
      return <article key={item.id} className="overflow-hidden rounded-2xl bg-[var(--cream)]">
        <div className="flex items-center justify-between px-4 pt-3">
          <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
            <input type="checkbox" aria-label={`选择知识：${item.title}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} className="h-4 w-4 accent-[var(--ink)]"/>
            选择
          </label>
          <button disabled={deleting} onClick={() => void remove([item.id])} aria-label={`删除知识：${item.title}`} className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-[var(--muted)]"><Trash2 size={14}/></button>
        </div>
        {coverImage
          ? <img src={coverImage} alt={`${item.title}封面`} loading="lazy" referrerPolicy="no-referrer" className="max-h-[480px] w-full bg-[var(--almond)] object-contain"/>
          : <div className="grid aspect-[4/3] w-full place-items-center bg-[var(--almond)] text-[var(--muted)]"><ImageIcon size={28}/></div>}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-bold leading-5">{item.title}</h3>
            {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`打开来源：${item.title}`} className="shrink-0 text-[var(--muted)]"><ExternalLink size={14}/></a>}
          </div>
          {item.author && <p className="mt-2 text-xs text-[var(--muted)]">作者：{item.author}</p>}
          {(likes !== undefined || saves !== undefined) && <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
            {likes !== undefined && <span className="inline-flex items-center gap-1"><Heart size={13}/>点赞 {likes.toLocaleString()}</span>}
            {saves !== undefined && <span className="inline-flex items-center gap-1"><Bookmark size={13}/>收藏 {saves.toLocaleString()}</span>}
          </div>}
          <div className="mt-3 flex flex-wrap gap-1">{item.tags.slice(0, 4).map(tag => <span key={tag} className="rounded-full bg-[var(--almond)] px-2 py-1 text-[10px]">{tag}</span>)}</div>
          <p className="fine mt-3">来源：{sourceLabel}</p>
          {item.category === "ai_image" && coverImage && <button
            type="button"
            disabled={currentCoverId === item.id}
            aria-label={currentCoverId === item.id ? `当前封面：${item.title}` : `设为当前封面：${item.title}`}
            onClick={() => useAsCover(item, coverImage)}
            className="soft-button mt-3 flex w-full items-center justify-center gap-2 text-xs disabled:opacity-65"
          >
            {currentCoverId === item.id && <Check size={14}/>}
            {currentCoverId === item.id ? "当前封面" : "设为当前封面"}
          </button>}
          <label className="mt-3 block text-xs font-bold text-[var(--muted)]">分类
            <select aria-label={`修改分类：${item.title}`} value={item.category} onChange={event => void changeCategory(item.id, event.target.value as KnowledgeCategory)} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--ink)]">
              {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
        </div>
      </article>;
    })}</div>}
    {!open && visibleItems.length === 0 && <div className="border-t border-[var(--line)] p-12 text-center text-sm text-[var(--muted)]">暂无内容</div>}
  </section>;
}
