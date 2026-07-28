"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DRAFT_STORAGE_EVENT, loadDrafts, updateDraft } from "@/lib/content/draft-storage";
import type { Draft, DraftPublishStatus } from "@/lib/types";

const statuses: { value: DraftPublishStatus; label: string; description: string }[] = [
  { value: "draft", label: "draft", description: "内容仍在编辑" },
  { value: "reviewing", label: "reviewing", description: "等待人工审核" },
  { value: "ready_to_publish", label: "ready_to_publish", description: "审核完成，可发布" },
  { value: "published", label: "published", description: "发布流程已完成（演示）" },
];

export default function PublishCenterPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    const refresh = () => {
      const loaded = loadDrafts(window.localStorage);
      setDrafts(loaded);
      const requested = new URLSearchParams(window.location.search).get("draft");
      setSelectedId(current => requested && loaded.some(draft => draft.id === requested) ? requested : current || loaded[0]?.id || "");
    };
    refresh();
    window.addEventListener(DRAFT_STORAGE_EVENT, refresh);
    return () => window.removeEventListener(DRAFT_STORAGE_EVENT, refresh);
  }, []);
  const selected = drafts.find(draft => draft.id === selectedId);
  const setStatus = (publishStatus: DraftPublishStatus) => {
    if (selected) updateDraft(window.localStorage, selected.id, { publishStatus });
  };

  return <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:py-10">
    <PageHeader eyebrow="Publish Workflow" title="Publish Center" description="完成小红书发布前的状态确认。当前为产品流程演示，不会真实发布内容。"/>
    <section className="panel mt-6 grid gap-6 p-5 sm:p-7 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div><p className="fine">Draft queue</p><div className="mt-4 space-y-2">{drafts.map(draft => <button key={draft.id} onClick={() => setSelectedId(draft.id)} className={`w-full rounded-2xl border p-4 text-left ${draft.id === selectedId ? "border-[var(--rose)] bg-[var(--rose)]/15" : "border-[var(--line)] bg-white/60"}`}><strong className="block text-sm">{draft.title || "未命名草稿"}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{draft.publishStatus} · 小红书</span></button>)}</div></div>
      {selected ? <div>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="fine">Platform</p><h2 className="mt-2 text-xl font-bold">小红书</h2><p className="mt-1 text-sm text-[var(--muted)]">{selected.title || "未命名草稿"}</p></div><span className="rounded-full bg-[var(--rose)]/25 px-3 py-1 text-xs font-bold text-[var(--rose-deep)]">{selected.publishStatus}</span></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">{statuses.map(status => <button key={status.value} onClick={() => setStatus(status.value)} className={`rounded-2xl border p-4 text-left ${selected.publishStatus === status.value ? "border-[var(--rose)] bg-[var(--rose)]/15" : "border-[var(--line)] bg-white/60"}`}><span className="flex items-center gap-2 text-sm font-bold">{selected.publishStatus === status.value && <CheckCircle2 size={16}/>} {status.label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{status.description}</span></button>)}</div>
        <div className="mt-7 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5"><Link href={`/drafts/${encodeURIComponent(selected.id)}`} className="soft-button text-sm">返回编辑</Link><button disabled={selected.publishStatus !== "ready_to_publish"} onClick={() => setStatus("published")} className="primary-button flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"><Send size={15}/>模拟发布</button></div>
      </div> : <div className="grid min-h-56 place-items-center text-sm text-[var(--muted)]">暂无可发布草稿</div>}
    </section>
  </main>;
}
