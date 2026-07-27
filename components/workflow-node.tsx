import { Check, Circle, LoaderCircle } from "lucide-react";
import type { WorkflowStep } from "@/lib/types";
export function WorkflowNode({step,index}:{step:WorkflowStep;index:number}) {
  const Icon=step.status==="completed"?Check:step.status==="running"?LoaderCircle:Circle;
  return <article className={`relative flex gap-5 rounded-[24px] border p-5 transition ${step.status==="running"?"border-[var(--rose-deep)] bg-[var(--rose)]/25 shadow-[var(--shadow)]":"border-[var(--line)] bg-white/65"}`}>
    <div className={`z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full ${step.status==="completed"?"bg-[var(--sage)] text-white":step.status==="running"?"bg-[var(--ink)] text-white":"bg-[var(--cream)] text-[var(--muted)]"}`}><Icon size={18}/></div>
    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="fine">0{index+1} · {step.status}</p><h3 className="mt-1 font-bold">{step.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{step.subtitle}</p>{step.model&&<span className="mt-2 inline-block rounded-full bg-[var(--almond)] px-2.5 py-1 text-[10px] font-bold">Model · {step.model}</span>}</div>{step.duration&&<span className="text-xs text-[var(--muted)]">{step.duration}</span>}</div>{step.output&&<p className="mt-3 rounded-xl bg-white/55 px-3 py-2 text-xs">{step.output}</p>}</div>
  </article>
}
