"use client";
import { useEffect, useState } from "react";
import { Check, PlugZap } from "lucide-react";
import type { ModelConfig, ModelProvider } from "@/lib/types";
import { migrateLegacyModelStorage, saveModelPreferences } from "@/lib/models/client-storage";

export function ModelConfigCard({ title, description, initial, options, modes }: { title: string; description: string; initial: ModelConfig; options: { value: ModelProvider; label: string }[]; modes?: boolean }) {
  const [config, setConfig] = useState(initial);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testError, setTestError] = useState("");
  useEffect(() => migrateLegacyModelStorage(window.localStorage), []);
  const connect = async () => {
    setTesting(true);
    setTestError("");
    try {
      const response = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: config.kind }),
      });
      const result = await response.json();
      setConfig(value => ({ ...value, status: result.success ? "connected" : "disconnected" }));
      if (!result.success) setTestError(result.error?.code ?? "CONNECTION_FAILED");
      if (result.success && config.kind === "image" && result.check === "CONFIG_COMPLETE_GENERATION_PENDING") {
        setTestError("配置完整，首次生成时验证");
      }
    } catch {
      setConfig(value => ({ ...value, status: "disconnected" }));
      setTestError("CONNECTION_FAILED");
    } finally {
      setTesting(false);
    }
  };
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
        <Field label="Base URL" value="由服务器环境变量管理" readOnly/>
        <label className="sm:col-span-2 text-xs font-bold text-[var(--muted)]">API Key<div className="mt-2 flex rounded-2xl border border-[var(--line)] bg-white/70"><input aria-label={`${title} API Key`} type="password" value="" placeholder="仅从服务器环境变量读取" readOnly className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"/></div></label>
      </div>
      {testError && <p role="alert" className="mt-3 text-xs text-[var(--rose-deep)]">连接失败：{testError}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button onClick={connect} disabled={testing} className="soft-button flex items-center gap-2 text-sm"><PlugZap size={15}/>{testing ? "连接中…" : "测试连接"}</button><button onClick={() => { saveModelPreferences(window.localStorage, { mode: config.mode, provider: config.provider, model: config.name }); setSaved(true); setTimeout(() => setSaved(false), 1200); }} className="primary-button flex items-center gap-2">{saved && <Check size={15}/>} {saved ? "已保存" : "保存配置"}</button></div>
    </div>
  </section>;
}

function Field({ label, value, onChange, readOnly = false }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return <label className="text-xs font-bold text-[var(--muted)]">{label}<input value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] outline-none"/></label>;
}
