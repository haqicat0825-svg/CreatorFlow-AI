"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { WorkflowNode } from "@/components/workflow-node";
import { advanceWorkflow, resetWorkflow } from "@/lib/workflow";

export default function WorkflowPage(){
 const [steps,setSteps]=useState(resetWorkflow); const [running,setRunning]=useState(false); const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 useEffect(()=>{if(running){timer.current=setInterval(()=>setSteps(prev=>{const next=advanceWorkflow(prev);if(next.every(s=>s.status==="completed"))setRunning(false);return next}),1500)}return()=>{if(timer.current)clearInterval(timer.current)}},[running]);
 return <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><PageHeader eyebrow="Live Agent Orchestration" title="Agent Workflow" description="任务：生成一篇韩系穿搭内容。每个 Agent 都清楚自己的输入、输出和等待关系。" action={<div className="flex gap-2">{<button className="primary-button flex items-center gap-2" onClick={()=>setRunning(v=>!v)}>{running?<><Pause size={15}/>暂停</>:<><Play size={15}/>运行模拟</>}</button>}<button aria-label="重置流程" className="soft-button" onClick={()=>{setRunning(false);setSteps(resetWorkflow())}}><RotateCcw size={16}/></button></div>}/><div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]"><section className="relative space-y-3 before:absolute before:bottom-8 before:left-[42px] before:top-8 before:w-px before:bg-[var(--rose)]">{steps.map((s,i)=><WorkflowNode key={s.id} step={s} index={i}/>)}</section><aside className="space-y-5"><div className="panel p-6"><p className="fine">Live log</p><h2 className="mt-2 text-xl font-bold">执行日志</h2><div className="mt-6 space-y-4 text-sm">{steps.filter(s=>s.status!=="waiting").map(s=><div key={s.id} className="border-l-2 border-[var(--rose)] pl-3"><p className="font-semibold">{s.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{s.output||"正在执行任务…"}</p></div>)}</div></div><div className="panel !bg-[var(--almond)] p-6"><p className="fine">Memory context</p><p className="mt-3 text-sm leading-6">已载入「韩系甜美风」与 18 条个人偏好，输出会优先保持低饱和、温柔且可复刻。</p></div></aside></div></main>
}
