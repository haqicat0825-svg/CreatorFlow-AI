"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock3, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { readCurrentCreatorState } from "@/lib/content/execution-state";
import type { CreatorTaskEnvelope } from "@/lib/content/task-envelope";
import type { CreatorExecutionState } from "@/lib/content/execution-state";

type Snapshot = { task: CreatorTaskEnvelope | null; execution: CreatorExecutionState | null };

export function DashboardLive() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ task: null, execution: null });

  useEffect(() => {
    const refresh = () => setSnapshot(readCurrentCreatorState(window.sessionStorage));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const { task, execution } = snapshot;
  const topic = task?.brief.topic ?? "等待创建内容任务";
  const hasTrend = Boolean(task?.trendContext);
  const isRunning = execution?.status === "generating";
  const isComplete = execution?.status === "completed";
  const styleCount = task?.brief.styles.length ?? 0;
  const evidenceCount = task?.trendContext?.sourceReferences.length ?? 0;
  const agents = [
    {
      id: "research", name: "Research Agent", role: "内容研究专家", icon: "search" as const,
      status: hasTrend ? "ready" as const : task ? "working" as const : "waiting" as const,
      recentTask: topic, completed: hasTrend ? `已完成 1 次趋势分析 · ${evidenceCount} 条来源` : "今日完成 0 次趋势分析",
      output: hasTrend ? task!.trendContext!.executiveSummary : "等待用户确认趋势研究结果",
    },
    {
      id: "style", name: "Style Agent", role: "个人风格顾问", icon: "sparkles" as const,
      status: task ? "ready" as const : "waiting" as const, recentTask: topic,
      completed: task ? `已应用 ${styleCount} 个风格标签` : "尚未载入个人风格",
      output: task?.brief.styles.join(" · ") || "等待 Content Brief",
    },
    {
      id: "writer", name: "Writer Agent", role: "内容生成专家", icon: "pen" as const,
      status: isRunning ? "working" as const : isComplete ? "ready" as const : "waiting" as const,
      recentTask: topic, completed: isComplete ? "本任务已完成 1 次文案生成" : "本任务尚未完成文案",
      output: execution?.title || (isRunning ? "正在生成标题与正文" : "等待研究与风格输入"),
    },
    {
      id: "review", name: "Review Agent", role: "审核专家", icon: "shield" as const,
      status: isComplete ? "ready" as const : "waiting" as const, recentTask: topic,
      completed: isComplete ? "本任务已完成 1 次内容审核" : "本任务尚未进入审核",
      output: execution?.safetyScore !== undefined ? `Safety ${execution.safetyScore} · 已完成规则检查` : "等待 Writer Agent 输出",
    },
  ];
  const plan = [
    ["周一", "爆款研究", hasTrend ? "completed" : task ? "running" : "waiting"],
    ["周二", "趋势分析", hasTrend ? "completed" : "waiting"],
    ["周三", "生成文案", isComplete ? "completed" : isRunning ? "running" : "waiting"],
    ["周四", "生成封面", execution?.hasCoverPrompt ? "completed" : "waiting"],
    ["周五", "发布审核", isComplete ? "completed" : "waiting"],
  ] as const;

  return <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
    <header className="flex items-center justify-between">
      <div><p className="fine">AI Content Operation Studio</p><h1 className="font-display mt-2 text-3xl sm:text-4xl">CreatorFlow AI</h1></div>
      <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted)] sm:flex"><span className="h-2 w-2 rounded-full bg-[var(--sage)]"/>{task ? "当前任务已载入" : "等待新任务"}</div>
    </header>
    <section className="mt-10 grid gap-5 lg:grid-cols-[1.55fr_.8fr]">
      <div className="panel relative overflow-hidden !bg-[var(--rose)] p-6 sm:p-8">
        <div className="relative z-10 max-w-xl"><p className="fine !text-[var(--ink)]/60">当前任务 · {execution?.status === "completed" ? "已完成" : execution?.status === "generating" ? "执行中" : "待执行"}</p><h2 className="font-display mt-5 text-4xl leading-[1.08] sm:text-5xl">{topic}</h2><p className="mt-5 max-w-md text-sm leading-6 text-[var(--ink)]/70">{task ? `目标：${task.brief.goal} · 受众：${task.brief.audiences.join("、")}` : "完成 Content Brief 后，Agent 状态会根据当前任务自动更新。"}</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button inline-flex items-center gap-2" href={task ? "/creator" : "/create-task"}>{task ? "继续创作" : "创建任务"} <ArrowUpRight size={16}/></Link><Link className="soft-button !bg-white/35" href="/workflow">查看执行流程</Link></div></div>
        <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full border-[42px] border-white/20"/>
      </div>
      <aside className="panel p-6">
        <div className="flex items-center justify-between"><div><p className="fine">Content rhythm</p><h2 className="mt-2 text-xl font-bold">本周节奏</h2></div><CalendarDays size={20}/></div>
        <div className="mt-6 space-y-3">{plan.map(([day, label, status]) => {
          const Icon = status === "completed" ? Check : status === "running" ? Clock3 : Circle;
          return <div key={day} className="flex items-center gap-3 rounded-2xl bg-[var(--cream)] px-3 py-2.5"><Icon size={19} className={status === "completed" ? "text-[var(--sage)]" : status === "running" ? "text-[var(--rose-deep)]" : "text-[var(--muted)]"}/><span className="w-9 text-xs font-bold text-[var(--muted)]">{day}</span><span className="flex-1 text-sm font-semibold">{label}</span><span className="text-[10px] font-bold uppercase text-[var(--muted)]">{status === "completed" ? "完成" : status === "running" ? "进行中" : "待执行"}</span></div>;
        })}</div>
      </aside>
    </section>
    <section className="mt-12">
      <div className="flex items-end justify-between"><div><p className="fine">Your creative crew</p><h2 className="font-display mt-2 text-3xl">我的 AI 内容团队</h2></div><Link href="/workflow" className="hidden text-sm font-semibold sm:block">查看工作流 →</Link></div>
      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{agents.map((agent, index) => <AgentCard key={agent.id} agent={agent} featured={index === 0}/>)}</div>
    </section>
  </main>;
}
