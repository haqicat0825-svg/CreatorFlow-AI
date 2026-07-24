import { PenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { Agent } from "@/lib/types";
import { StatusPill } from "./ui";

const icons = { search: Search, sparkles: Sparkles, pen: PenLine, shield: ShieldCheck };
export function AgentCard({ agent, featured = false }: { agent: Agent; featured?: boolean }) {
  const Icon = icons[agent.icon];
  return <article className={`panel relative overflow-hidden p-5 transition hover:-translate-y-1 ${featured ? "min-h-[218px] !bg-[var(--ink)] text-white" : "min-h-[190px]"}`}>
    <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${featured ? "bg-white/12" : "bg-[var(--almond)]"}`}><Icon size={20}/></span><StatusPill status={agent.status}/></div>
    <div className="mt-9"><p className={`text-xs ${featured ? "text-white/55" : "text-[var(--muted)]"}`}>{agent.role}</p><h3 className="mt-1 text-lg font-bold">{agent.name}</h3><p className={`mt-3 text-sm ${featured ? "text-white/70" : "text-[var(--muted)]"}`}>{agent.detail}</p></div>
    {agent.status === "working" && <div className="pulse-line absolute inset-x-5 bottom-0 h-[2px]"/>}
  </article>;
}
