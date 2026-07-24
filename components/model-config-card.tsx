"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, PlugZap } from "lucide-react";
import type { ModelConfig, ModelProvider } from "@/lib/types";

export function ModelConfigCard({ title, description, initial, options, modes }: { title: string; description: string; initial: ModelConfig; options: { value: ModelProvider; label: string }[]; modes?: boolean }) {
  const [config, setConfig] = useState(initial);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const connect = () => { setTesting(true); setTimeout(() => { setConfig(v => ({ ...v, status: "connected" })); setTesting(false); }, 450); };
  const activeLabel = config.provider === "cloud-api" ? "Cloud endpoint" : config.provider === "local-cli" ? "Local runtime" : "Image provider";
  return <section className="panel overflow-hidden">
    <div className="flex flex-col gap-4 border-b border-[var(--line)] p-6 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="fine">{config.kind} model</p><h2 className="mt-2 text-2xl font-bold">{title}</h2><p className="mt-2 text-sm text-[var(--muted)]">{description}</p></div>
      <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${config.status === "connected" ? "bg-[var(--sage)]/25" : "bg-[var(--almond)]"}`}><span className={`h-2 w-2 rounded-full ${config.status === "connected" ? "bg-[var(--sage)]" : "bg-[#b5aaa4]"}`}/>{config.status === "connected" ? "Connected" : "Disconnected"}</span>
    </div>
    <div className="p-6">
      {modes && <div className="mb-6 flex gap-2">{options.map(o => <button key={o.value} aria-pressed={config.provider === o.value} onClick={() => setConfig({ ...config, provider: o.value, status: "disconnected" })} className={`rounded-full px-4 py-2 text-sm font-semibold ${config.provider === o.value ? "bg-[var(--ink)] text-white" : "border border-[var(--line)]"}`}>{o.label}</button>)}</div>}
      {!modes && <label className="mb-6 block text-xs font-bold text-[var(--muted)]">Provider<select value={config.provider} onChange={e => setConfig({ ...config, provider: e.target.value as ModelProvider, status: "disconnected" })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)]">{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
      <p className="fine mb-4">{activeLabel}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="模型名称" value={config.name} onChange={name => setConfig({ ...config, name })}/>
        <Field label="Base URL" value={config.baseUrl} onChange={baseUrl => setConfig({ ...config, baseUrl })}/>
        <label className="sm:col-span-2 text-xs font-bold text-[var(--muted)]">API Key<div className="mt-2 flex rounded-2xl border border-[var(--line)] bg-white/70"><input aria-label={`${title} API Key`} type={showKey ? "text" : "password"} value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"/><button aria-label={showKey ? "隐藏 API Key" : "显示 API Key"} onClick={() => setShowKey(v => !v)} className="px-4">{showKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button onClick={connect} className="soft-button flex items-center gap-2 text-sm"><PlugZap size={15}/>{testing ? "连接中…" : "测试连接"}</button><button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1200); }} className="primary-button flex items-center gap-2">{saved && <Check size={15}/>} {saved ? "已保存" : "保存配置"}</button></div>
    </div>
  </section>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="text-xs font-bold text-[var(--muted)]">{label}<input value={value} onChange={e => onChange(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>;
}
