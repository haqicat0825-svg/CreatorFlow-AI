"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  FileCheck2,
  FileText,
  ImageIcon,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { DRAFT_STORAGE_EVENT } from "@/lib/content/draft-storage";
import {
  DASHBOARD_ACTIVITY_EVENT,
  readDashboardStatus,
  type DashboardStatus,
  type DashboardTaskStatus,
} from "@/lib/dashboard/status";

const EMPTY_STATUS: DashboardStatus = {
  currentTopic: "正在读取运营数据",
  hasTask: false,
  isGenerating: false,
  isMock: false,
  demoCase: undefined,
  metrics: { trends: 0, analyzedTrends: 0, contents: 0, images: 0, pendingReview: 0 },
  recentTasks: [],
};

const taskStatusStyles: Record<DashboardTaskStatus, string> = {
  "生成中": "bg-[var(--rose)]/35 text-[var(--rose-deep)]",
  "待审核": "bg-[var(--almond)] text-[var(--ink)]",
  "已完成": "bg-[var(--sage)]/25 text-[var(--ink)]",
};

export function DashboardLive() {
  const [status, setStatus] = useState(EMPTY_STATUS);

  useEffect(() => {
    const refresh = () => setStatus(readDashboardStatus(window.localStorage, window.sessionStorage));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(DRAFT_STORAGE_EVENT, refresh);
    window.addEventListener(DASHBOARD_ACTIVITY_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DRAFT_STORAGE_EVENT, refresh);
      window.removeEventListener(DASHBOARD_ACTIVITY_EVENT, refresh);
    };
  }, []);

  const { metrics } = status;
  const overview = [
    { label: "趋势发现", value: metrics.trends, unit: "个", icon: BarChart3 },
    { label: "内容生成", value: metrics.contents, unit: "篇", icon: FileText },
    { label: "AI 图片生成", value: metrics.images, unit: "张", icon: ImageIcon },
    { label: "待审核草稿", value: metrics.pendingReview, unit: "篇", icon: FileCheck2 },
  ];
  const agents = [
    {
      id: "research", name: "Research Agent", role: "内容研究专家", icon: "search" as const,
      status: metrics.trends > 0 ? "ready" as const : "waiting" as const,
      recentTask: status.currentTopic, completed: `今日发现 ${metrics.trends} 个趋势`,
      output: metrics.trends > 0 ? "研究数据已同步" : "等待研究结果",
    },
    {
      id: "analysis", name: "Trend Analysis Agent", role: "趋势分析专家", icon: "sparkles" as const,
      status: metrics.analyzedTrends > 0 ? "ready" as const : "waiting" as const,
      recentTask: status.currentTopic, completed: `已分析 ${metrics.analyzedTrends} 个趋势`,
      output: metrics.analyzedTrends > 0 ? "趋势洞察已更新" : "等待趋势研究输入",
    },
    {
      id: "writer", name: "Writer Agent", role: "内容生成专家", icon: "pen" as const,
      status: status.isGenerating ? "working" as const : metrics.contents > 0 ? "ready" as const : "waiting" as const,
      recentTask: status.currentTopic, completed: `今日生成 ${metrics.contents} 篇内容`,
      output: status.isGenerating ? "正在生成标题与正文" : metrics.contents > 0 ? "内容草稿已保存" : "等待趋势洞察",
    },
    {
      id: "visual", name: "Visual Agent", role: "视觉生成专家", icon: "sparkles" as const,
      status: metrics.images > 0 ? "ready" as const : "waiting" as const,
      recentTask: status.currentTopic, completed: `今日生成 ${metrics.images} 张图片`,
      output: metrics.images > 0 ? "视觉素材已同步" : "等待内容方向",
    },
    {
      id: "review", name: "Review Agent", role: "审核专家", icon: "shield" as const,
      status: metrics.pendingReview > 0 ? "working" as const : "waiting" as const,
      recentTask: status.currentTopic, completed: `待审核 ${metrics.pendingReview} 篇草稿`,
      output: metrics.pendingReview > 0 ? "等待人工审核" : "当前没有待审核内容",
    },
  ];

  return <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
    <header className="flex items-center justify-between">
      <div><p className="fine">AI Content Operation Studio</p><h1 className="font-display mt-2 text-3xl sm:text-4xl">CreatorFlow AI</h1></div>
      <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted)] sm:flex"><span className="h-2 w-2 rounded-full bg-[var(--sage)]"/>{status.demoCase ? "演示案例" : status.hasTask ? "当前任务已载入" : "运营数据已同步"}</div>
    </header>

    <section className="mt-10 grid gap-5 lg:grid-cols-[1.55fr_.8fr]">
      <div className="panel relative overflow-hidden !bg-[var(--rose)] p-6 sm:p-8">
        <div className="relative z-10 max-w-xl"><p className="fine !text-[var(--ink)]/60">{status.demoCase ? status.demoCase.label : "AI 内容运营控制中心"}</p><h2 className="font-display mt-5 text-4xl leading-[1.08] sm:text-5xl">{status.currentTopic}</h2><p className="mt-5 max-w-md text-sm leading-6 text-[var(--ink)]/70">{status.demoCase ? "从趋势研究、分析、内容与视觉生成，到草稿审核，快速了解 CreatorFlow AI 的完整工作流。" : "Research、Trend Analysis、Writer、Visual 与 Review 状态会根据当前工作流数据自动更新。"}</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button inline-flex items-center gap-2" href={status.hasTask ? "/creator" : "/create-task"}>{status.hasTask ? "继续创作" : "创建任务"} <ArrowUpRight size={16}/></Link><Link className="soft-button !bg-white/35" href="/workflow">查看执行流程</Link></div></div>
        <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full border-[42px] border-white/20"/>
      </div>
      <aside className="panel p-6">
        <div className="flex items-end justify-between"><div><p className="fine">Today overview</p><h2 className="mt-2 text-xl font-bold">今日运营概览</h2></div>{status.isMock && <span className="text-xs font-semibold text-[var(--muted)]">演示</span>}</div>
        <div className="mt-5 grid grid-cols-2 gap-3">{overview.map(item => {
          const Icon = item.icon;
          return <div key={item.label} className="rounded-2xl bg-[var(--cream)] p-4"><div className="flex items-center justify-between text-[var(--muted)]"><span className="text-xs font-bold">{item.label}</span><Icon size={16}/></div><p className="mt-3 text-2xl font-bold">{item.value}<span className="ml-1 text-xs font-semibold text-[var(--muted)]">{item.unit}</span></p></div>;
        })}</div>
      </aside>
    </section>

    {status.demoCase && <DemoShowcasePanel demo={status.demoCase}/>}

    <section className="panel mt-12 flex flex-col justify-between gap-6 overflow-hidden !bg-[var(--almond)]/55 p-6 sm:flex-row sm:items-center sm:p-8" aria-label="Demo 案例入口">
      <div>
        <p className="fine">演示案例 · Demo Showcase</p>
        <h2 className="font-display mt-2 text-3xl">韩系穿搭账号增长方案</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">独立展示 Research、趋势分析、内容写作、AI 视觉与草稿审核的完整流程；演示数据不会进入真实工作台。</p>
      </div>
      <Link href="/demo" className="primary-button inline-flex shrink-0 items-center justify-center gap-2">
        查看完整案例 <ArrowUpRight size={16}/>
      </Link>
    </section>

    <section className="mt-12">
      <div className="flex items-end justify-between"><div><p className="fine">Your creative crew</p><h2 className="font-display mt-2 text-3xl">我的 AI 内容团队</h2></div><Link href="/workflow" className="hidden text-sm font-semibold sm:block">查看工作流 →</Link></div>
      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{agents.map((agent, index) => <AgentCard key={agent.id} agent={agent} featured={index === 0}/>)}</div>
    </section>

    <section className="mt-12 pb-8">
      <div><p className="fine">Recent activity</p><h2 className="font-display mt-2 text-3xl">最近任务</h2></div>
      <div className="panel mt-6 overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_140px_110px_170px] gap-4 border-b border-[var(--line)] px-6 py-4 text-xs font-bold text-[var(--muted)] sm:grid"><span>标题</span><span>类型</span><span>状态</span><span>更新时间</span></div>
        <div className="divide-y divide-[var(--line)]">{status.recentTasks.map(task => <article key={task.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_140px_110px_170px] sm:items-center sm:gap-4 sm:px-6">
          <strong className="truncate text-sm">{task.title}</strong>
          <span className="text-xs text-[var(--muted)]">{task.type}</span>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${taskStatusStyles[task.status]}`}>{task.status}</span>
          <time className="text-xs text-[var(--muted)]">{formatUpdatedAt(task.updatedAt)}</time>
        </article>)}</div>
      </div>
    </section>
  </main>;
}

function DemoShowcasePanel({ demo }: { demo: NonNullable<DashboardStatus["demoCase"]> }) {
  const steps = [
    {
      name: "Research",
      icon: Search,
      content: <><p className="text-sm font-bold">{demo.research.hotTrends[0]}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">热门趋势 · {demo.research.hotTrends.join("、")}</p><p className="mt-3 text-xs font-bold">搜索结果 {demo.research.searchResultCount} 条</p></>,
    },
    {
      name: "Trend Analysis",
      icon: BarChart3,
      content: <><p className="text-sm font-bold">{demo.analysis.trendTheme}</p><p className="mt-2 text-xs text-[var(--muted)]">热度评分 <strong className="text-[var(--rose-deep)]">{demo.analysis.heatScore}</strong></p><p className="mt-3 line-clamp-2 text-xs leading-5">推荐选题 · {demo.analysis.recommendedTopics.join(" / ")}</p></>,
    },
    {
      name: "Writer",
      icon: FileText,
      content: <><p className="text-sm font-bold">{demo.writer.title}</p><p className="mt-2 line-clamp-4 text-xs leading-5 text-[var(--muted)]">{demo.writer.body}</p></>,
    },
    {
      name: "Visual",
      icon: Sparkles,
      content: <div className="mt-1 overflow-hidden rounded-2xl border border-white/50 p-4" style={{ background: `linear-gradient(135deg, ${demo.visual.palette[1]}, ${demo.visual.palette[0]})` }}><p className="fine">{demo.visual.coverSubtitle}</p><p className="font-display mt-5 text-2xl">{demo.visual.coverTitle}</p><p className="mt-1 text-xs">AI 封面示例</p></div>,
    },
    {
      name: "Draft",
      icon: FileCheck2,
      content: <><p className="text-sm font-bold">内容与封面已进入草稿</p><span className="mt-4 inline-flex rounded-full bg-[var(--almond)] px-3 py-1 text-xs font-bold">{demo.draft.reviewStatus}</span><p className="mt-3 text-xs text-[var(--muted)]">等待人工确认后进入发布流程</p></>,
    },
  ];

  return <section className="mt-12" aria-label="演示案例完整流程">
    <div className="flex items-end justify-between gap-4"><div><p className="fine">{demo.label}</p><h2 className="font-display mt-2 text-3xl">完整 AI 内容创作流程</h2></div><span className="hidden text-sm font-semibold text-[var(--muted)] sm:block">{demo.theme}</span></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{steps.map(step => {
      const Icon = step.icon;
      return <article key={step.name} className="panel min-h-[210px] p-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--almond)]"><Icon size={17}/></span><h3 className="text-sm font-bold">{step.name}</h3></div><div className="mt-5">{step.content}</div></article>;
    })}</div>
  </section>;
}

function formatUpdatedAt(value: string) {
  if (value.startsWith("今天") || value.startsWith("昨天")) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
    : value;
}
