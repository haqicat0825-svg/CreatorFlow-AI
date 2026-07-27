"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Save, Send, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getDraft, updateDraft } from "@/lib/content/draft-storage";
import { loadSelectedCover } from "@/lib/content/selected-cover";
import type { Draft } from "@/lib/types";

export default function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [draft, setDraft] = useState<Draft>();
  const [tags, setTags] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void params.then(({ id: draftId }) => {
      setId(draftId);
      const loaded = getDraft(window.localStorage, draftId);
      setDraft(loaded);
      setTags(loaded?.tags.join("，") ?? "");
    });
  }, [params]);

  const patch = (changes: Partial<Draft>) => setDraft(current => current ? { ...current, ...changes } : current);
  const save = () => {
    if (!draft) return;
    const updated = updateDraft(window.localStorage, id, { ...draft, tags: tags.split(/[,，]/) });
    setDraft(updated);
    setNotice("草稿已保存。");
  };
  const useLibraryCover = () => {
    const selected = loadSelectedCover(window.localStorage);
    if (!selected) return setNotice("AI 图片库中还没有已选择的当前封面。");
    patch({ coverImage: selected.imageUrl, images: [...new Set([selected.imageUrl, ...(draft?.images ?? [])])], imageSource: "library" });
    setNotice("已载入 AI 图片库当前封面，保存草稿后生效。");
  };
  const uploadCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      patch({ coverImage: image, images: [...new Set([image, ...(draft?.images ?? [])])], imageSource: "upload" });
    };
    reader.readAsDataURL(file);
  };

  if (!draft) return <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8"><Link href="/drafts" className="soft-button inline-flex items-center gap-2 text-sm"><ArrowLeft size={15}/>返回 Draft Studio</Link><section className="panel mt-6 p-10 text-center text-sm text-[var(--muted)]">未找到草稿，或草稿仍在载入。</section></main>;

  return <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:py-10">
    <PageHeader eyebrow="Draft Detail" title={draft.title || "未命名草稿"} description="编辑内容与封面，在进入发布审核前保存所有修改。"/>
    <div className="mt-5 flex flex-wrap justify-between gap-3">
      <Link href="/drafts" className="soft-button inline-flex items-center gap-2 text-sm"><ArrowLeft size={15}/>返回 Draft Studio</Link>
      <div className="flex gap-2"><button onClick={save} className="primary-button flex items-center gap-2 text-sm"><Save size={15}/>保存草稿</button><Link href={`/publish-center?draft=${encodeURIComponent(id)}`} className="soft-button flex items-center gap-2 text-sm"><Send size={15}/>发布设置</Link></div>
    </div>
    {notice && <p role="status" className="mt-4 rounded-2xl bg-[var(--rose)]/20 px-4 py-3 text-sm text-[var(--rose-deep)]">{notice}</p>}
    <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="panel space-y-5 p-5 sm:p-7">
        <label className="block text-xs font-bold text-[var(--muted)]">标题<input maxLength={300} value={draft.title} onChange={event => patch({ title: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-[var(--ink)] outline-none"/></label>
        <label className="block text-xs font-bold text-[var(--muted)]">正文<textarea maxLength={100000} value={draft.content} onChange={event => patch({ content: event.target.value })} className="mt-2 min-h-[420px] w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm leading-7 text-[var(--ink)] outline-none"/></label>
        <label className="block text-xs font-bold text-[var(--muted)]">标签（逗号分隔）<input value={tags} onChange={event => setTags(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>
      </div>
      <aside className="panel h-fit overflow-hidden">
        <div className="grid min-h-80 place-items-center bg-[var(--almond)]/45 p-4">
          {draft.coverImage ? <img src={draft.coverImage} alt={`${draft.title} 封面预览`} className="max-h-[560px] w-full object-contain"/> : <div className="grid aspect-[3/4] w-full place-items-center text-sm text-[var(--muted)]">3:4 封面预览</div>}
        </div>
        <div className="p-5"><p className="fine">Cover image · 完整比例显示</p><div className="mt-4 grid gap-2">
          <button onClick={useLibraryCover} className="soft-button flex items-center justify-center gap-2 text-sm"><ImagePlus size={15}/>从 AI 图片库更换</button>
          <label className="soft-button flex cursor-pointer items-center justify-center gap-2 text-sm"><Upload size={15}/>上传封面<input type="file" accept="image/*" onChange={uploadCover} className="sr-only"/></label>
        </div></div>
      </aside>
    </section>
  </main>;
}
