"use client";
import { useEffect, useState } from "react";
import { Check, Expand } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ModelStatusPanel } from "@/components/model-status-panel";
import { PromptCard, type PromptSettings } from "@/components/prompt-card";
import { loadImagePreferences, saveImagePreferences } from "@/lib/models/client-storage";
import type { GeneratedImage, ImageGenerationResult } from "@/lib/providers/image-types";

type VisualTask = {
  taskId: string;
  coverPrompt: string;
  style?: string[];
  audience?: string[];
  contentGoal?: string;
};
type GenerationState = "idle" | "generating" | "success" | "error" | "rate-limited" | "rejected";

const fallbackPrompt = "韩系秋季街拍，奶油色针织与低饱和背景，自然光，松弛但精致的杂志封面构图，保留标题安全留白。";
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
  const [serverOpenAIModel, setServerOpenAIModel] = useState("gpt-image-1");
  const [serverConfigured, setServerConfigured] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [resultMeta, setResultMeta] = useState<Pick<ImageGenerationResult, "provider" | "model" | "isMock"> | null>(null);
  const [selected, setSelected] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [error, setError] = useState("");
  const [setDone, setSetDone] = useState(false);

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
        provider: preferences.provider === "openai" ? "openai" : "mock",
        model: preferences.model || current.model,
        ratio: ["3:4", "1:1", "4:3"].includes(preferences.aspectRatio) ? preferences.aspectRatio as PromptSettings["ratio"] : current.ratio,
        quality: ["low", "medium", "high"].includes(preferences.quality) ? preferences.quality as PromptSettings["quality"] : current.quality,
        candidateCount: [1, 2, 4].includes(preferences.candidateCount) ? preferences.candidateCount : current.candidateCount,
      }));
    }
    void loadServerImageConfig();
  }, []);

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
      setSettings(current => ({
        ...current,
        provider: payload.provider === "openai" ? "openai" : "mock",
        model: payload.model || current.model,
      }));
    } catch {
      // Mock remains available when the configuration check cannot be reached.
    }
  };

  const updateSettings = (next: PromptSettings) => {
    const normalized = next.provider === "mock"
      ? { ...next, model: "CreatorFlow Image Demo" }
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
      if (!response.ok || !payload.success) {
        const code = payload.error?.code;
        setGenerationState(code === "RATE_LIMITED" ? "rate-limited" : code === "CONTENT_REJECTED" ? "rejected" : "error");
        setError(imageErrorMessage(code));
        return;
      }
      const result = payload.data as ImageGenerationResult;
      setImages(result.images.slice(0, 4));
      setSelected(result.images[0]?.id ?? "");
      setResultMeta({ provider: result.provider, model: result.model, isMock: result.isMock });
      setGenerationState("success");
    } catch {
      setGenerationState("error");
      setError("图片生成失败，请稍后重试。");
    }
  };

  const chooseCover = () => {
    if (!selected) return;
    setSetDone(true);
    window.setTimeout(() => setSetDone(false), 1400);
  };

  return <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="AI Visual Direction" title="Visual Studio" description="把主题转化为清晰的封面方向，在最多四个候选中选出最符合个人风格的一张。"/>
    <div className="mt-4 min-h-8" aria-live="polite">
      {generationState === "generating" && <p className="text-sm text-[var(--muted)]">图片模型正在生成候选封面…</p>}
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
            ? Array.from({ length: settings.candidateCount }, (_, index) => <div data-testid="cover-skeleton" key={index} className={`aspect-[${settings.ratio.replace(":", "/")}] animate-pulse rounded-[22px] bg-[var(--almond)]`}/>)
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
        {images.length > 0 && <p className="mt-4 text-xs text-[var(--muted)]">临时图片可能过期；Phase 3C 不进行永久保存或第三方上传。</p>}
      </section>
      <ModelStatusPanel
        title="图片生成模型"
        eyebrow="Image model"
        provider={settings.provider === "openai" ? "OpenAI Image" : "Demo / Mock"}
        model={settings.model}
        mode={settings.provider === "openai" ? "cloud" : "mock"}
        configured={settings.provider === "mock" || serverConfigured}
        statusLabel={settings.provider === "openai" ? "Real API" : "Mock"}
        details={[
          { label: "生成摘要", value: `${settings.ratio} · ${settings.quality} · ${settings.candidateCount} 张` },
        ]}
      />
    </div>
  </main>;
}

function imageErrorMessage(code: string | undefined) {
  const messages: Record<string, string> = {
    CONFIGURATION_MISSING: "图片模型尚未配置，可切换到 Demo / Mock。",
    UNAUTHORIZED: "图片模型鉴权失败，请检查服务端环境变量。",
    RATE_LIMITED: "图片模型请求过于频繁，请稍后重试。",
    TIMEOUT: "图片生成超时，Prompt 和已有候选已保留。",
    CONTENT_REJECTED: "Prompt 未通过内容安全检查，请调整后重试。",
    INVALID_RESPONSE: "图片模型返回了无效结果。",
    INVALID_REQUEST: "图片生成参数无效，请检查 Prompt 和选项。",
  };
  return messages[code ?? ""] ?? "图片生成失败，Prompt 和已有候选已保留。";
}
