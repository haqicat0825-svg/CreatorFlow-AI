"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Expand, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ModelStatusPanel } from "@/components/model-status-panel";
import { PromptCard, type PromptSettings } from "@/components/prompt-card";
import { loadImagePreferences, saveImagePreferences } from "@/lib/models/client-storage";
import type { GeneratedImage, ImageGenerationResult } from "@/lib/providers/image-types";
import type { ImageGenerationTask, ImageTaskStep } from "@/lib/image-tasks/types";
import { saveSelectedCover } from "@/lib/content/selected-cover";
import { saveDraft } from "@/lib/content/draft-storage";

type VisualTask = {
  taskId: string;
  coverPrompt: string;
  style?: string[];
  audience?: string[];
  contentGoal?: string;
  title?: string;
  content?: string;
  tags?: string[];
  textModel?: string;
};
type GenerationState = "idle" | "generating" | "success" | "error" | "rate-limited" | "rejected";

const fallbackPrompt = "韩系甜美穿搭，小红书爆款封面，女生街拍，奶油色低饱和色调，自然光摄影，杂志感与高级氛围，3:4 竖版构图，预留标题区域。";
const OPENAI_IMAGE_MODEL = "gpt-image-1";
const VOLCENGINE_JIMENG_MODEL = "doubao-seedream-5-0-pro-260628";
const initialSettings: PromptSettings = {
  ratio: "3:4",
  quality: "medium",
  candidateCount: 4,
  provider: "mock",
  model: "CreatorFlow Image Demo",
};

export default function VisualStudioPage() {
  const [prompt, setPrompt] = useState(fallbackPrompt);
  const [task, setTask] = useState<VisualTask | null>(null);
  const [settings, setSettings] = useState<PromptSettings>(initialSettings);
  const [serverOpenAIModel, setServerOpenAIModel] = useState(OPENAI_IMAGE_MODEL);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [resultMeta, setResultMeta] = useState<Pick<ImageGenerationResult, "provider" | "model" | "isMock"> | null>(null);
  const [selected, setSelected] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [error, setError] = useState("");
  const [setDone, setSetDone] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [activeStep, setActiveStep] = useState<ImageTaskStep>("analyzing");

  useEffect(() => {
    const storedTask = window.sessionStorage.getItem("creatorflow-visual-task");
    if (storedTask) {
      try {
        const parsed = JSON.parse(storedTask) as VisualTask;
        if (parsed.coverPrompt) {
          setTask(parsed);
          setPrompt(parsed.coverPrompt);
        }
      } catch {
        // Invalid legacy state is ignored without clearing the editable fallback prompt.
      }
    }
    const preferences = loadImagePreferences(window.localStorage);
    if (preferences) {
      setSettings(current => ({
        ...current,
        provider: ["openai", "volcengine-jimeng", "mock"].includes(preferences.provider)
          ? preferences.provider as PromptSettings["provider"]
          : "mock",
        model: preferences.model || current.model,
        ratio: ["3:4", "1:1", "4:3"].includes(preferences.aspectRatio) ? preferences.aspectRatio as PromptSettings["ratio"] : current.ratio,
        quality: ["low", "medium", "high"].includes(preferences.quality) ? preferences.quality as PromptSettings["quality"] : current.quality,
        candidateCount: [1, 2, 4].includes(preferences.candidateCount) ? preferences.candidateCount : current.candidateCount,
      }));
    }
    void loadServerImageConfig();
    void restoreLatestTask();
  }, []);

  useEffect(() => {
    if (!activeTaskId || generationState !== "generating") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/generate/image/status?id=${encodeURIComponent(activeTaskId)}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) applyTask(payload.data as ImageGenerationTask);
      } catch {
        // A transient polling failure does not change the persisted server task.
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTaskId, generationState]);

  const restoreLatestTask = async () => {
    try {
      const response = await fetch("/api/generate/image/status", { cache: "no-store" });
      if (response.status === 404) return;
      const payload = await response.json();
      if (response.ok && payload.success) applyTask(payload.data as ImageGenerationTask);
    } catch {
      // Visual Studio remains usable when there is no persisted task yet.
    }
  };

  const applyTask = (serverTask: ImageGenerationTask) => {
    setActiveTaskId(serverTask.id);
    setActiveStep(serverTask.step);
    if (serverTask.prompt) setPrompt(serverTask.prompt);
    if (serverTask.status === "processing") {
      setGenerationState("generating");
      return;
    }
    if (serverTask.status === "failed") {
      setGenerationState(serverTask.error?.code === "RATE_LIMITED" ? "rate-limited" : serverTask.error?.code === "CONTENT_REJECTED" ? "rejected" : "error");
      setError(serverTask.error?.message ?? "图片生成失败，请稍后重试。");
      return;
    }
    if (serverTask.result) {
      setImages(serverTask.result.images.slice(0, 4));
      setSelected(serverTask.result.images[0]?.id ?? "");
      setResultMeta({
        provider: serverTask.result.provider,
        model: serverTask.result.model,
        isMock: serverTask.result.isMock,
      });
      setGenerationState("success");
      window.dispatchEvent(new Event("creatorflow:knowledge-updated"));
    }
  };

  const loadServerImageConfig = async () => {
    try {
      const response = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "image" }),
      });
      const payload = await response.json();
      setServerConfigured(Boolean(payload.configured));
      if (payload.provider === "openai" && payload.model) setServerOpenAIModel(payload.model);
      const provider = ["openai", "volcengine-jimeng", "mock"].includes(payload.provider)
        ? payload.provider as PromptSettings["provider"]
        : "mock";
      setSettings(current => ({
        ...current,
        provider,
        model: payload.model || current.model,
      }));
    } catch {
      // Mock remains available when the configuration check cannot be reached.
    }
  };

  const updateSettings = (next: PromptSettings) => {
    const normalized = next.provider === "mock"
      ? { ...next, model: "CreatorFlow Image Demo" }
      : next.provider === "volcengine-jimeng"
        ? { ...next, model: VOLCENGINE_JIMENG_MODEL }
        : { ...next, model: serverOpenAIModel };
    setSettings(normalized);
    saveImagePreferences(window.localStorage, {
      provider: normalized.provider,
      model: normalized.model,
      aspectRatio: normalized.ratio,
      quality: normalized.quality,
      candidateCount: normalized.candidateCount,
    });
  };

  const generate = async () => {
    setGenerationState("generating");
    setError("");
    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio: settings.ratio,
          quality: settings.quality,
          candidateCount: settings.candidateCount,
          provider: settings.provider,
          model: settings.model,
          referenceContext: task ? {
            style: task.style,
            audience: task.audience,
            contentGoal: task.contentGoal,
          } : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.taskId) {
        const code = payload.error?.code;
        setGenerationState(code === "RATE_LIMITED" ? "rate-limited" : code === "CONTENT_REJECTED" ? "rejected" : "error");
        setError(imageErrorMessage(code));
        return;
      }
      setActiveTaskId(payload.taskId);
      setActiveStep("analyzing");
    } catch {
      setGenerationState("error");
      setError("图片生成失败，请稍后重试。");
    }
  };

  const chooseCover = () => {
    const image = images.find(candidate => candidate.id === selected);
    if (!image || !resultMeta) return;
    saveSelectedCover(window.localStorage, {
      imageUrl: image.url,
      imageId: image.id,
      source: "generated",
      prompt,
      model: resultMeta.model,
      provider: resultMeta.provider,
    });
    setSetDone(true);
    window.setTimeout(() => setSetDone(false), 1400);
  };

  const saveToDraftStudio = () => {
    const image = images.find(candidate => candidate.id === selected);
    if (!image || !task?.title || !task.content) return;
    const imageSource = "generated" as const;
    saveSelectedCover(window.localStorage, {
      imageUrl: image.url,
      imageId: image.id,
      source: imageSource,
      prompt,
      model: resultMeta?.model,
      provider: resultMeta?.provider,
    });
    saveDraft(window.localStorage, {
      title: task.title,
      content: task.content,
      tags: task.tags ?? [],
      coverImage: image.url,
      images: images.map(candidate => candidate.url),
      imageSource,
      prompt,
      model: task.textModel ?? resultMeta?.model ?? "未记录",
    });
    setDraftSaved(true);
  };

  return <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="AI Visual Direction" title="Visual Studio" description="把主题转化为清晰的封面方向，在最多四个候选中选出最符合个人风格的一张。"/>
    <div className="mt-4 min-h-8" aria-live="polite">
      {generationState === "generating" && <div>
        <p className="text-sm font-semibold text-[var(--ink)]">AI 正在生成封面</p>
        <p className="mt-1 text-xs text-[var(--muted)]">预计需要 30–90 秒，请耐心等待</p>
      </div>}
      {resultMeta && generationState === "success" && <p className={`rounded-xl px-4 py-2 text-sm ${resultMeta.isMock ? "bg-[var(--almond)] font-semibold" : "text-[var(--muted)]"}`}>{resultMeta.isMock ? "Demo / Mock：未调用真实图片模型。" : `真实模型：${resultMeta.provider} / ${resultMeta.model}`}</p>}
      {error && <p role="alert" className="rounded-xl bg-[var(--rose)]/25 px-4 py-2 text-sm text-[var(--rose-deep)]">{error}</p>}
    </div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(360px,1fr)] xl:grid-cols-[300px_minmax(380px,1fr)_280px]">
      <PromptCard value={prompt} onChange={setPrompt} settings={settings} onSettingsChange={updateSettings} onGenerate={generate} generating={generationState === "generating"}/>
      <section className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div><p className="fine">{images.length} candidates</p><h2 className="mt-1 text-xl font-bold">封面候选</h2></div>
          <button onClick={chooseCover} disabled={!selected} className="soft-button flex items-center gap-2 text-sm disabled:opacity-50">{setDone ? <><Check size={15}/>已设为封面</> : "设为封面"}</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          {generationState === "generating"
            ? <GenerationProgress activeStep={activeStep} />
            : images.map(image => <button key={image.id} aria-label={`候选封面 ${image.id}`} aria-pressed={selected === image.id} onClick={() => setSelected(image.id)} className={`relative overflow-hidden rounded-[22px] border-2 text-left transition ${selected === image.id ? "border-[var(--rose-deep)] p-1" : "border-transparent"}`}>
              <div className="relative overflow-hidden rounded-[18px] bg-[var(--almond)]" style={{ aspectRatio: settings.ratio.replace(":", "/") }}>
                {/* Temporary URLs/data are rendered only in memory and never persisted in browser storage. */}
                <img src={image.url} alt="AI 生成的封面候选" className="h-full w-full object-cover"/>
                {selected === image.id && <span className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-[var(--ink)] text-white"><Check size={15}/></span>}
                <Expand className="absolute bottom-3 right-3 z-10 text-white drop-shadow" size={16}/>
              </div>
            </button>)}
        </div>
        {images.length === 0 && generationState !== "generating" && <div className="mt-5 grid min-h-72 place-items-center rounded-[22px] bg-[var(--cream)] px-6 text-center text-sm text-[var(--muted)]">编辑 Prompt 并生成候选封面。失败时已有候选不会被清空。</div>}
        {images.length > 0 && <p className="mt-4 text-xs text-[var(--muted)]">生成结果已自动保存到 AI 图片库。</p>}
        {images.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={saveToDraftStudio} disabled={!selected || !task?.title || !task.content} className="primary-button flex items-center gap-2 disabled:opacity-50"><Save size={16}/>保存到草稿中心</button>
          {draftSaved && <><span className="text-sm font-semibold text-[var(--rose-deep)]">已保存到草稿中心</span><Link href="/drafts" className="soft-button text-sm">查看草稿</Link></>}
        </div>}
      </section>
      <ModelStatusPanel
        title="图片生成模型"
        eyebrow="Image model"
        provider={settings.provider === "openai" ? "OpenAI Image" : settings.provider === "volcengine-jimeng" ? "Volcengine Jimeng" : "Demo / Mock"}
        model={settings.model}
        mode={settings.provider === "mock" ? "mock" : "cloud"}
        configured={settings.provider === "mock" || serverConfigured}
        statusLabel={settings.provider === "mock" ? "Mock" : "Real API"}
        details={[
          { label: "生成摘要", value: `${settings.ratio} · ${settings.quality} · ${settings.candidateCount} 张` },
        ]}
      />
    </div>
  </main>;
}

function GenerationProgress({ activeStep }: { activeStep: ImageTaskStep }) {
  const steps: Array<{ key: ImageTaskStep; label: string }> = [
    { key: "analyzing", label: "分析穿搭主题" },
    { key: "building_prompt", label: "构建视觉 Prompt" },
    { key: "calling_model", label: "调用 Seedream 模型" },
    { key: "generating_image", label: "生成封面图片" },
    { key: "saving_library", label: "保存到图片库" },
  ];
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeStep));

  return <div data-testid="generation-progress" className="col-span-2 grid min-h-72 place-items-center rounded-[22px] bg-[var(--cream)] px-6 py-8">
    <div className="w-full max-w-xs">
      <div className="space-y-3">
        {steps.map((step, index) => <div
          key={step.key}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${index <= activeIndex ? "bg-white/70 text-[var(--ink)]" : "bg-white/35 text-[var(--muted)]"}`}
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--rose)]/35 text-[var(--rose-deep)]">{index < activeIndex ? "✓" : index === activeIndex ? "•" : index + 1}</span>
          {step.label}
        </div>)}
      </div>
    </div>
  </div>;
}

function imageErrorMessage(code: string | undefined) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "图片模型鉴权失败，请检查服务端环境变量。",
    RATE_LIMITED: "图片模型请求过于频繁，请稍后重试。",
    TIMEOUT: "图片生成超时，Prompt 和已有候选已保留。",
    CONTENT_REJECTED: "Prompt 未通过内容安全检查，请调整后重试。",
    INVALID_RESPONSE: "图片模型返回了无效结果。",
    INVALID_REQUEST: "图片生成参数无效，请检查 Prompt 和选项。",
  };
  return messages[code ?? ""] ?? "图片生成失败，Prompt 和已有候选已保留。";
}
