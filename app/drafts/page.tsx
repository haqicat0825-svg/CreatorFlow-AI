"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Hash, ImagePlus, Pencil, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DRAFT_STORAGE_EVENT, loadDrafts } from "@/lib/content/draft-storage";
import type { Draft } from "@/lib/types";

export default function DraftStudioPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => setDrafts(loadDrafts(window.localStorage));
    refresh();
    window.addEventListener(DRAFT_STORAGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DRAFT_STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const saveImage = async (draft: Draft) => {
    if (!draft.coverImage) return setNotice("请先为草稿添加封面。");
    setSavingId(draft.id);
    setNotice("");
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "ai_image",
          title: `草稿图片 · ${draft.title || "未命名草稿"}`,
          content: `来自 Draft Studio：${draft.title || "未命名草稿"}`,
          sourceType: "other",
          imageUrl: draft.coverImage,
          images: draft.images,
          tags: [...draft.tags, "Draft Studio"],
          contentType: "reference",
          qualityStatus: "approved",
          authenticityStatus: "verified",
          model: draft.model,
          provider: draft.imageSource,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "保存图片失败。");
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
      setNotice("图片已保存到 AI 图片库。");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "保存图片失败。");
    } finally {
      setSavingId("");
    }
  };

  return <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="Human Review" title="Draft Studio" description="集中编辑内容、管理图片，并在发布前完成审核与确认。"/>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted)]">草稿中心 · {drafts.length} 篇内容</p>
      <div className="flex items-center gap-2"><span className="fine">小红书</span><Link href="/publish-center" className="soft-button flex items-center gap-2 text-sm"><Send size={15}/>Publish Center</Link></div>
    </div>
    {notice && <p role="status" className="mt-4 rounded-2xl bg-[var(--rose)]/20 px-4 py-3 text-sm text-[var(--rose-deep)]">{notice}</p>}
    {drafts.length === 0
      ? <section className="panel mt-6 grid min-h-72 place-items-center px-6 text-center">
          <div><FileText className="mx-auto text-[var(--rose-deep)]" size={28}/><h2 className="mt-4 font-bold">还没有草稿</h2><p className="mt-2 text-sm text-[var(--muted)]">从 Content Creator 或 Visual Studio 保存后，草稿会显示在这里。</p></div>
        </section>
      : <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map(draft => <article key={draft.id} className="panel overflow-hidden">
            <div className="grid min-h-64 place-items-center bg-[var(--almond)]/45 p-3">
              {draft.coverImage ? <img src={draft.coverImage} alt={`${draft.title} 封面`} className="max-h-[420px] w-full object-contain"/> : <div className="grid aspect-[3/4] w-full max-w-[280px] place-items-center text-sm text-[var(--muted)]">待添加封面</div>}
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[var(--rose)]/30 px-3 py-1 text-xs font-bold text-[var(--rose-deep)]">{statusLabel(draft.publishStatus)}</span><time className="text-xs text-[var(--muted)]">{formatDate(draft.createdAt)}</time></div>
              <h2 className="mt-4 text-lg font-bold">{draft.title || "未命名草稿"}</h2>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{draft.content || "暂无正文"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2"><Hash size={14}/>{draft.tags.map(tag => <span key={tag} className="rounded-full bg-[var(--almond)] px-2.5 py-1 text-xs">{tag}</span>)}</div>
              <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]"><p>模型 · {draft.model || "未记录"}</p><p className="mt-1">图片来源 · {sourceLabel(draft.imageSource)}</p></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={`/drafts/${encodeURIComponent(draft.id)}`} className="soft-button flex items-center justify-center gap-2 text-xs"><Pencil size={14}/>编辑草稿</Link>
                <button disabled={savingId === draft.id} onClick={() => void saveImage(draft)} className="soft-button flex items-center justify-center gap-2 text-xs disabled:opacity-60"><Download size={14}/>{savingId === draft.id ? "保存中…" : "保存图片"}</button>
                <Link href={`/drafts/${encodeURIComponent(draft.id)}?focus=cover`} className="soft-button flex items-center justify-center gap-2 text-xs"><ImagePlus size={14}/>更换封面</Link>
                <Link href={`/publish-center?draft=${encodeURIComponent(draft.id)}`} className="soft-button flex items-center justify-center gap-2 text-xs"><Send size={14}/>发布设置</Link>
              </div>
            </div>
          </article>)}
        </section>}
  </main>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function sourceLabel(source: Draft["imageSource"]) {
  return source === "generated" ? "AI 生成" : source === "library" ? "图片库" : source === "upload" ? "上传" : "暂无封面";
}

function statusLabel(status: Draft["publishStatus"]) {
  return { draft: "draft", reviewing: "reviewing", ready: "ready", published: "published" }[status];
}
