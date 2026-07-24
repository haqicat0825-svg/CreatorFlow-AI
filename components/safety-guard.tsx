import { AlertCircle, Check, ShieldCheck } from "lucide-react";
import type { SafetyReport } from "@/lib/types";

export function SafetyGuard({ report }: { report: SafetyReport }) {
  return <section className="panel !bg-[var(--ink)] p-6 text-white">
    <div className="flex items-start justify-between"><div><p className="fine !text-white/50">Safety Guard</p><h2 className="mt-2 text-xl font-bold">内容真实性约束</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><ShieldCheck size={20}/></span></div>
    <div className="mt-6 flex items-end justify-between border-b border-white/10 pb-5"><div><p className="text-xs text-white/55">Content Quality Score</p><p className="font-display mt-1 text-5xl">{report.score}</p></div><span className="rounded-full bg-[var(--sage)]/25 px-3 py-2 text-xs font-bold text-[#dce6dc]">High quality</span></div>
    <div className="mt-5 space-y-3">{report.checks.map(check => <div key={check.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-white/75">{check.label}</span><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${check.status === "passed" ? "text-[#cbd9ca]" : "text-[#f0c19b]"}`}>{check.status === "passed" ? <Check size={14}/> : <AlertCircle size={14}/>} {check.status === "passed" ? "Passed" : "Review"}</span></div>)}</div>
  </section>;
}
