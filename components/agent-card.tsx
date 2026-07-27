import { PenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import { StatusPill } from "./ui";

const icons = { search: Search, sparkles: Sparkles, pen: PenLine, shield: ShieldCheck };
type LiveAgent = {
  name: string; role: string; status: "working" | "ready" | "waiting";
  icon: keyof typeof icons; recentTask: string; completed: string; output: string;
};
export function AgentCard({ agent, featured = false }: { agent: LiveAgent; featured?: boolean }) {
  const Icon = icons[agent.icon];
  return <article className={`panel relative overflow-hidden p-5 transition hover:-translate-y-1 ${featured ? "min-h-[218px] !bg-[var(--ink)] text-white" : "min-h-[190px]"}`}>
    <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${featured ? "bg-white/12" : "bg-[var(--almond)]"}`}><Icon size={20}/></span><StatusPill status={agent.status}/></div>
    <div className="mt-7"><p className={`text-xs ${featured ? "text-white/55" : "text-[var(--muted)]"}`}>{agent.role}</p><h3 className="mt-1 text-lg font-bold">{agent.name}</h3><dl className={`mt-4 space-y-2 text-xs ${featured ? "text-white/70" : "text-[var(--muted)]"}`}><div><dt className="font-bold">最近任务</dt><dd className="mt-0.5 truncate">{agent.recentTask}</dd></div><div><dt className="font-bold">完成数量</dt><dd className="mt-0.5">{agent.completed}</dd></div><div><dt className="font-bold">输出结果</dt><dd className="mt-0.5 line-clamp-2">{agent.output}</dd></div></dl></div>
  </article>;
}
