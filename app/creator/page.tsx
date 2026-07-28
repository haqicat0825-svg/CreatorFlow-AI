"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Hash, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ModelStatusPanel } from "@/components/model-status-panel";
import { topics } from "@/data/mock";
import { segmentedControlClass } from "@/lib/ui/segmented-control";
import type { GeneratedContent } from "@/lib/providers/types";
import {
  CREATOR_TASK_STORAGE_KEY,
  parseStoredCreatorTask,
  type CreatorTaskEnvelope,
} from "@/lib/content/task-envelope";
import type { EditableDraft, TitleCandidate } from "@/lib/types";
import {
  CREATOR_EXECUTION_STORAGE_KEY,
  type CreatorExecutionState,
} from "@/lib/content/execution-state";
import {
  loadSelectedCover,
  SELECTED_COVER_EVENT,
  type SelectedCover,
} from "@/lib/content/selected-cover";
import { saveDraft } from "@/lib/content/draft-storage";

type GenerationState = "idle" | "generating" | "success" | "error";

export default function CreatorPage() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState<EditableDraft>({ ...topics[0].draft });
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [taskEnvelope, setTaskEnvelope] = useState<CreatorTaskEnvelope | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"topics" | "copy" | "cover" | "model">("copy");
  const [selectedCover, setSelectedCover] = useState<SelectedCover | null>(null);
  const started = useRef(false);

  const generate = useCallback(async (task: CreatorTaskEnvelope) => {
    setGenerationState("generating");
    setError("");
    storeExecution({ schemaVersion: "1", topic: task.brief.topic, status: "generating", updatedAt: new Date().toISOString() });
    try {
      const response = await fetch("/api/generate/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: task.brief,
          ...(task.trendContext ? { trendContext: task.trendContext } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(errorMessage(payload.error?.code));
      }
      const result = payload.data as GeneratedContent;
      setGenerated(result);
      setSelected(0);
      setDraft(current => ({
        ...current,
        title: result.titles[0].title,
        body: result.body,
        tags: result.tags,
      }));
      setGenerationState("success");
      storeExecution({
        schemaVersion: "1", topic: task.brief.topic, status: "completed",
        provider: result.metadata.provider, model: result.metadata.model,
        title: result.titles[0].title, safetyScore: result.safetyReport.score,
        hasCoverPrompt: Boolean(result.coverPrompt), updatedAt: new Date().toISOString(),
      });
    } catch (cause) {
      setGenerationState("error");
      setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试。");
      storeExecution({ schemaVersion: "1", topic: task.brief.topic, status: "failed", updatedAt: new Date().toISOString() });
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stored = window.sessionStorage.getItem(CREATOR_TASK_STORAGE_KEY);
    if (!stored) {
      setError("请先完成 Content Brief，再开始生成。");
      return;
    }
    try {
      const task = parseStoredCreatorTask(stored);
      setTaskEnvelope(task);
      void generate(task);
    } catch {
      setError("Creator 任务无效，请返回 Content Brief 重新确认。");
    }
  }, [generate]);

  useEffect(() => {
    const refreshCover = () => setSelectedCover(loadSelectedCover(window.localStorage));
    refreshCover();
    window.addEventListener(SELECTED_COVER_EVENT, refreshCover);
    window.addEventListener("storage", refreshCover);
    return () => {
      window.removeEventListener(SELECTED_COVER_EVENT, refreshCover);
      window.removeEventListener("storage", refreshCover);
    };
  }, []);

  useEffect(() => {
    if (saved) saveCurrentDraft();
    // Saving is driven only by the explicit button state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const candidates: TitleCandidate[] = generated?.titles ?? topics.map(topic => ({
    id: topic.id,
    title: topic.title,
    match: topic.match,
  }));
  const choose = (index: number) => {
    setSelected(index);
    setDraft(value => ({ ...value, title: candidates[index].title }));
    setTab("copy");
  };
  const openVisualStudio = () => {
    if (!generated?.coverPrompt || !taskEnvelope) return;
    window.sessionStorage.setItem("creatorflow-visual-task", JSON.stringify({
      taskId: crypto.randomUUID(),
      coverPrompt: generated.coverPrompt,
      style: taskEnvelope.brief.styles,
      audience: taskEnvelope.brief.audiences,
      contentGoal: taskEnvelope.brief.goal,
      title: draft.title,
      content: draft.body,
      tags: draft.tags,
      textModel: generated.metadata.model,
    }));
  };
  const saveCurrentDraft = () => {
    saveDraft(window.localStorage, {
      title: draft.title,
      content: draft.body,
      tags: draft.tags,
      coverImage: selectedCover?.imageUrl ?? "",
      imageSource: selectedCover?.source ?? "none",
      prompt: selectedCover?.prompt ?? "",
      model: generated?.metadata.model ?? "未记录",
    });
  };

  return <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10"><PageHeader eyebrow="AI-assisted editorial desk" title="Content Creator" description="从十个高匹配选题中挑选方向，再与你的 Writer Agent 一起完成内容。"/>
    <div className="mt-4 min-h-6" aria-live="polite">
      <p className="mb-2 text-xs font-bold text-[var(--rose-deep)]">当前草稿状态 · draft</p>
      {generationState === "generating" && <p className="text-sm text-[var(--muted)]">Writer Agent 正在生成真实文案…</p>}
      {generated?.isMock && <p className="rounded-xl bg-[var(--almond)] px-4 py-2 text-sm font-semibold">Demo / Mock：当前未调用真实模型。</p>}
      {generationState === "success" && generated && !generated.isMock && <p className="text-sm text-[var(--muted)]">已由 {generated.metadata.provider} / {generated.metadata.model} 生成 · Safety {generated.safetyReport.score}</p>}
      {error && <p role="alert" className="rounded-xl bg-[var(--rose)]/25 px-4 py-2 text-sm text-[var(--rose-deep)]">{error}</p>}
    </div>
    <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-2xl bg-white/60 p-1.5 xl:hidden">{[["topics","选题"],["copy","文案"],["cover","封面"],["model","模型"]].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id as typeof tab)} className={`min-w-0 px-2 ${segmentedControlClass(tab===id)}`}>{label}</button>)}</div>
    <div className="mt-6 grid min-h-[680px] gap-4 lg:grid-cols-[290px_minmax(360px,1fr)_320px] xl:grid-cols-[220px_minmax(340px,1fr)_260px_280px]">
      <section className={`${tab!=="topics"?"hidden lg:block":""} panel max-h-[760px] overflow-y-auto p-4`}><div className="flex items-center justify-between px-2 py-2"><h2 className="font-bold">标题候选</h2><span className="text-xs text-[var(--muted)]">{candidates.length} ideas</span></div><div className="mt-2 space-y-2">{candidates.map((candidate,index)=><button key={candidate.id} onClick={()=>choose(index)} aria-label={`方案 ${index + 1}：${candidate.title}`} className={`w-full rounded-2xl border p-4 text-left transition ${selected===index?"border-[var(--rose-deep)] bg-[var(--rose)]/25":"border-transparent bg-[var(--cream)] hover:border-[var(--line)]"}`}><div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"><span>方案 {index + 1}</span><span>{candidate.match}% 匹配</span></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold">{candidate.title}</p><ChevronRight size={15}/></div></button>)}</div></section>
      <section className={`${tab!=="copy"?"hidden lg:block":""} panel flex flex-col p-5 sm:p-7`}><div className="flex items-center justify-between"><div><p className="fine">Writer Agent</p><h2 className="mt-1 text-xl font-bold">文案编辑器</h2></div><button disabled={generationState === "generating" || !taskEnvelope} className="soft-button flex items-center gap-2 text-sm" onClick={()=>taskEnvelope && void generate(taskEnvelope)}><RefreshCw className={generationState === "generating" ? "animate-spin" : ""} size={15}/>{generationState === "generating" ? "生成中…" : "重新生成"}</button></div><label className="mt-7 text-xs font-bold text-[var(--muted)]">标题<input aria-label="标题" value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} className="mt-2 w-full border-b border-[var(--line)] bg-transparent pb-4 text-2xl font-bold outline-none"/></label><label className="mt-6 flex flex-1 flex-col text-xs font-bold text-[var(--muted)]">正文<textarea aria-label="正文" value={draft.body} onChange={event=>setDraft({...draft,body:event.target.value})} className="mt-2 min-h-[300px] flex-1 resize-none rounded-2xl bg-[var(--cream)] p-5 text-sm font-normal leading-7 text-[var(--ink)] outline-none"/></label><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2"><Hash size={15}/>{draft.tags.map(tag=><span key={tag} className="rounded-full bg-[var(--almond)] px-3 py-1 text-xs">{tag}</span>)}</div><span className="text-xs text-[var(--muted)]">{draft.body.length} 字</span></div></section>
      <aside className={`${tab!=="cover"?"hidden lg:flex":""} panel flex-col p-5`}><div className="flex items-center justify-between"><h2 className="font-bold">封面预览</h2><span className="fine">3:4</span></div><div className="visual-art mt-5 aspect-[3/4] overflow-hidden rounded-[24px]" style={{"--art-a":draft.coverColors[0],"--art-b":draft.coverColors[1],"--art-c":draft.coverColors[2]} as React.CSSProperties}>{selectedCover && <img src={selectedCover.imageUrl} alt="当前选择的内容封面" className="absolute inset-0 h-full w-full object-cover"/>}<div className="absolute inset-x-5 bottom-5 z-10 rounded-2xl bg-white/78 p-4 backdrop-blur-md"><p className="fine">{selectedCover?.source === "library" ? "来自 AI 图片库" : selectedCover ? "来自刚刚生成的图片" : "Autumn look"}</p><p className="mt-1 font-bold leading-tight">{draft.title}</p></div></div>{generated?.coverPrompt && <><p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--muted)]">{generated.coverPrompt}</p><Link href="/visual-studio" onClick={openVisualStudio} className="soft-button mt-3 block w-full text-center text-sm">前往 Visual Studio 生成封面</Link></>}<Link href="/library?category=ai_image" className="soft-button mt-2 block w-full text-center text-sm">从 AI 图片库选择</Link>{generated?.ragReferences && generated.ragReferences.length > 0 && <div className="mt-4 border-t border-[var(--line)] pt-4"><p className="fine">引用来源 · {generated.ragReferences.length}</p><div className="mt-2 space-y-2">{generated.ragReferences.map(source => <div key={source.id} className="rounded-xl bg-[var(--cream)] px-3 py-2 text-xs"><p className="font-semibold">{source.title}</p>{source.sourceUrl && <a className="mt-1 block truncate text-[var(--rose-deep)]" href={source.sourceUrl} target="_blank" rel="noreferrer">查看原始来源</a>}</div>)}</div></div>}<button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1600)}} className="primary-button mt-5 flex items-center justify-center gap-2">{saved?<><Check size={16}/>已保存</>:<><Save size={16}/>保存草稿</>}</button></aside>
      <div className={`${tab!=="model"?"hidden xl:block":""}`}>
        <ModelStatusPanel
          title="文案生成模型"
          eyebrow="Writer model"
          provider={generated?.metadata.provider ?? "DeepSeek"}
          model={generated?.metadata.model ?? "DeepSeek-V4"}
          mode="cloud"
          configured={Boolean(generated && !generated.isMock)}
          statusLabel={generated?.isMock ? "Demo / Mock" : generated ? "Real API" : "服务端管理"}
          details={[
            { label: "Local CLI", value: "当前未启用" },
            { label: "Cloud API", value: "由服务端配置决定" },
            { label: "Safety Guard", value: generated ? `已启用 · ${generated.safetyReport.score}` : "已启用" },
          ]}
        />
      </div>
    </div>
    <div className="mt-4 flex justify-end"><Link href="/drafts" className="soft-button text-sm">进入草稿中心</Link></div>
  </main>;
}

function storeExecution(state: CreatorExecutionState) {
  window.sessionStorage.setItem(CREATOR_EXECUTION_STORAGE_KEY, JSON.stringify(state));
}

function errorMessage(code: string | undefined) {
  const messages: Record<string, string> = {
    CONFIGURATION_MISSING: "服务器尚未配置模型 API Key。",
    UNAUTHORIZED: "模型服务鉴权失败，请检查服务器配置。",
    RATE_LIMITED: "模型服务请求过于频繁，请稍后重试。",
    TIMEOUT: "模型请求超时，请稍后重试。",
    INVALID_RESPONSE: "模型返回格式无效，请重新生成。",
    MODEL_UNAVAILABLE: "配置的模型当前不可用。",
    LOCAL_CLI_DISABLED: "Local CLI 在 Phase 3A 尚未启用。",
    INVALID_REQUEST: "Content Brief 无效，请返回修改。",
  };
  return messages[code ?? ""] ?? "生成失败，请稍后重试。";
}
