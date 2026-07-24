import { Check, Cloud, ShieldCheck, Terminal } from "lucide-react";

type StatusItem = { label: string; value: string };

export function ModelStatusPanel({
  title, eyebrow, provider, model, mode, configured, statusLabel, details = [],
}: {
  title: string;
  eyebrow: string;
  provider: string;
  model: string;
  mode: "cloud" | "mock" | "local-cli";
  configured: boolean;
  statusLabel: string;
  details?: StatusItem[];
}) {
  const isLocal = mode === "local-cli";
  return (
    <aside aria-label={title} className="panel h-fit min-w-0 overflow-hidden">
      <div className="border-b border-[var(--line)] p-5">
        <p className="fine">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-bold">{title}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rose)] bg-[var(--rose)]/20 px-3 py-1.5 text-xs font-bold text-[#9b5664]">
            <Check size={13} aria-hidden="true" />{statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--ink)]">
            {isLocal ? <Terminal size={13} aria-hidden="true" /> : <Cloud size={13} aria-hidden="true" />}
            {isLocal ? "Local CLI" : mode === "mock" ? "Demo / Mock" : "Cloud API"}
          </span>
        </div>
      </div>
      <dl className="space-y-4 p-5 text-sm">
        <StatusRow label="Provider" value={provider} />
        <StatusRow label="模型名称" value={model} />
        <StatusRow label="配置状态" value={configured ? "已配置" : "等待服务端配置"} />
        {details.map(item => <StatusRow key={item.label} label={item.label} value={item.value} />)}
      </dl>
      <div className="border-t border-[var(--line)] bg-[var(--cream)]/70 px-5 py-4">
        <p className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--sage)]" size={15} aria-hidden="true" />
          安全连接由服务端环境变量管理；浏览器不读取、显示或保存 API Key。
        </p>
      </div>
    </aside>
  );
}

function StatusRow({ label, value }: StatusItem) {
  return <div className="min-w-0"><dt className="text-xs font-bold text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold text-[var(--ink)]">{value}</dd></div>;
}
