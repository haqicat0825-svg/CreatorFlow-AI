"use client";
import { Sparkles } from "lucide-react";

export type PromptSettings = {
  ratio: "3:4" | "1:1" | "4:3";
  quality: "low" | "medium" | "high";
  candidateCount: number;
  provider: "openai" | "volcengine-jimeng" | "mock";
  model: string;
};

export function PromptCard({
  value,
  onChange,
  settings,
  onSettingsChange,
  onGenerate,
  generating,
}: {
  value: string;
  onChange: (value: string) => void;
  settings: PromptSettings;
  onSettingsChange: (value: PromptSettings) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const set = <K extends keyof PromptSettings>(key: K, value: PromptSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  return <section className="panel p-5 sm:p-6">
    <p className="fine">Prompt composer</p>
    <h2 className="mt-2 text-xl font-bold">封面 Prompt</h2>
    <label className="mt-6 block text-xs font-bold text-[var(--muted)]">图片模型
      <select aria-label="图片模型" value={settings.provider} onChange={event => set("provider", event.target.value as PromptSettings["provider"])} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)]">
        <option value="openai">OpenAI · gpt-image-1</option>
        <option value="volcengine-jimeng">Volcengine Jimeng · doubao-seedream-5-0-pro-260628</option>
        <option value="mock">Demo / Mock</option>
      </select>
    </label>
    <label className="mt-5 block text-xs font-bold text-[var(--muted)]">Prompt
      <textarea aria-label="封面 Prompt" value={value} onChange={event => onChange(event.target.value)} maxLength={4000} className="mt-2 min-h-40 w-full resize-none rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm font-normal leading-6 text-[var(--ink)] outline-none"/>
    </label>
    <div className="mt-1 text-right text-[10px] text-[var(--muted)]">{value.length} / 4000</div>
    <div className="mt-5 grid grid-cols-3 gap-2">
      <Choice label="比例" value={settings.ratio} options={["3:4", "1:1", "4:3"]} onChange={value => set("ratio", value as PromptSettings["ratio"])}/>
      <Choice label="质量" value={settings.quality} options={["low", "medium", "high"]} onChange={value => set("quality", value as PromptSettings["quality"])}/>
      <Choice label="候选" value={String(settings.candidateCount)} options={["1", "2", "4"]} onChange={value => set("candidateCount", Number(value))}/>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">默认不生成封面文字；生成时会自动加入身份、品牌、真实性与安全留白规则。</p>
    <button disabled={generating || !value.trim()} onClick={onGenerate} className="primary-button mt-4 flex w-full items-center justify-center gap-2 disabled:opacity-50">
      <Sparkles size={16}/>{generating ? "正在生成…" : `生成 ${settings.candidateCount} 张`}
    </button>
  </section>;
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-[10px] font-bold text-[var(--muted)]">{label}
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2 text-xs text-[var(--ink)]">
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}
