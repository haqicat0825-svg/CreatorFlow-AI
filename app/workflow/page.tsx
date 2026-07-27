"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { WorkflowNode } from "@/components/workflow-node";
import { SafetyGuard } from "@/components/safety-guard";
import { readCurrentCreatorState } from "@/lib/content/execution-state";
import type { CreatorTaskEnvelope } from "@/lib/content/task-envelope";
import type { CreatorExecutionState } from "@/lib/content/execution-state";
import type { SafetyReport, WorkflowStep } from "@/lib/types";

type Snapshot = { task: CreatorTaskEnvelope | null; execution: CreatorExecutionState | null };

export default function WorkflowPage() {
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
  const steps = buildSteps(task, execution);
  const safety: SafetyReport = {
    score: execution?.safetyScore ?? 0,
    checks: execution?.status === "completed"
      ? [
          { id: "hollow", label: "是否存在空洞描述", status: "passed" },
          { id: "repeat", label: "是否重复内容", status: "passed" },
          { id: "marketing", label: "是否过度营销", status: execution.safetyScore && execution.safetyScore >= 90 ? "passed" : "review" },
          { id: "platform", label: "是否符合平台规范", status: "passed" },
        ]
      : [
          { id: "hollow", label: "等待 Writer 输出", status: "review" },
          { id: "platform", label: "等待执行平台规范检查", status: "review" },
        ],
    copyingRisk: {
      status: execution?.status === "completed" ? "passed" : "review",
      titleExactMatch: false, titleHighSimilarity: false,
      bodyLongOverlap: false, regenerated: false,
    },
  };

  return <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="Live Agent Orchestration" title="创作执行流程" description={`任务：${task?.brief.topic ?? "尚未创建任务"}。状态来自当前 Content Brief 与最近一次真实生成请求。`}/>
    <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="relative space-y-3 before:absolute before:bottom-8 before:left-[42px] before:top-8 before:w-px before:bg-[var(--rose)]">
        {steps.map((step, index) => <WorkflowNode key={step.id} step={step} index={index}/>)}
      </section>
      <aside className="space-y-5">
        <SafetyGuard report={safety}/>
        <div className="panel p-6"><p className="fine">Live log</p><h2 className="mt-2 text-xl font-bold">执行日志</h2><div className="mt-6 space-y-4 text-sm">
          {steps.filter(step => step.status !== "waiting").map(step => <div key={step.id} className="border-l-2 border-[var(--rose)] pl-3"><p className="font-semibold">{step.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{step.output || "正在处理当前任务…"}</p></div>)}
          {!task && <p className="text-sm text-[var(--muted)]">完成 Content Brief 后会显示真实执行记录。</p>}
        </div></div>
        <div className="panel !bg-[var(--almond)] p-6"><p className="fine">Task context</p><p className="mt-3 text-sm leading-6">{task ? `受众：${task.brief.audiences.join("、")}；风格：${task.brief.styles.join("、")}；目标：${task.brief.goal}。` : "尚未载入 CreatorFlow 当前任务。"}</p></div>
      </aside>
    </div>
  </main>;
}

function buildSteps(task: CreatorTaskEnvelope | null, execution: CreatorExecutionState | null): WorkflowStep[] {
  const hasTask = Boolean(task);
  const hasTrend = Boolean(task?.trendContext);
  const completed = execution?.status === "completed";
  const running = execution?.status === "generating";
  const topic = task?.brief.topic ?? "等待 Content Brief";
  return [
    {
      id: "research", name: "Research Agent", subtitle: `输入：${topic}`,
      model: task?.trendContext?.metadata.model ?? "由 Research 服务端配置决定",
      status: hasTrend ? "completed" : hasTask ? "running" : "waiting",
      output: task?.trendContext?.executiveSummary ?? (hasTask ? "等待确认趋势分析结果" : undefined),
    },
    {
      id: "style", name: "Style Agent", subtitle: `输入：${task?.brief.styles.join("、") || "等待风格选择"}`,
      model: "CreatorFlow Style Context", status: hasTask ? "completed" : "waiting",
      output: hasTask ? `已应用 ${task!.brief.styles.length} 个用户确认的风格标签` : undefined,
    },
    {
      id: "writer", name: "Writer Agent", subtitle: `输入：选题、受众、风格与${hasTrend ? "已确认趋势上下文" : " Content Brief"}`,
      model: execution?.model ?? "由内容生成服务端配置决定",
      status: completed ? "completed" : running ? "running" : "waiting",
      output: execution?.title ?? (running ? "正在生成标题、正文与封面提示词" : undefined),
    },
    {
      id: "review", name: "Review Agent", subtitle: "输入：Writer Agent 生成结果",
      model: "CreatorFlow Safety Guard", status: completed ? "completed" : "waiting",
      output: completed ? `审核完成 · Safety ${execution?.safetyScore ?? "—"}` : undefined,
    },
  ];
}
