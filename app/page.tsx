import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock3 } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { agents } from "@/data/mock";

export default function Dashboard() {
  return <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
    <header className="flex items-center justify-between">
      <div><p className="fine">AI Content Operation Studio</p><h1 className="font-display mt-2 text-3xl sm:text-4xl">CreatorFlow AI</h1></div>
      <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted)] sm:flex"><span className="h-2 w-2 rounded-full bg-[var(--sage)]"/>4 Agents online</div>
    </header>

    <section className="mt-10 grid gap-5 lg:grid-cols-[1.55fr_.8fr]">
      <div className="panel relative overflow-hidden !bg-[var(--rose)] p-6 sm:p-8">
        <div className="relative z-10 max-w-xl"><p className="fine !text-[var(--ink)]/60">今日任务 · Friday, Jul 24</p><h2 className="font-display mt-5 text-4xl leading-[1.08] sm:text-5xl">生成一篇<br/>韩系穿搭内容</h2><p className="mt-5 max-w-md text-sm leading-6 text-[var(--ink)]/70">Research Agent 正在整理最新趋势，你的风格记忆与爆款样本已经准备就绪。</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button inline-flex items-center gap-2" href="/creator">继续创作 <ArrowUpRight size={16}/></Link><span className="soft-button !bg-white/35">3 / 6 steps</span></div></div>
        <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full border-[42px] border-white/20"/><SparkleCluster/>
      </div>
      <aside className="panel p-6">
        <div className="flex items-center justify-between"><div><p className="fine">Content rhythm</p><h2 className="mt-2 text-xl font-bold">本周节奏</h2></div><CalendarDays size={20}/></div>
        <div className="mt-7 grid grid-cols-7 gap-2">{["M","T","W","T","F","S","S"].map((d,i)=><div key={i} className={`grid aspect-square place-items-center rounded-full text-xs ${i===4?"bg-[var(--ink)] text-white":i<4?"bg-[var(--almond)]":"text-[var(--muted)]"}`}>{d}</div>)}</div>
        <div className="mt-7 space-y-4">
          <div className="flex gap-3"><Check className="mt-0.5 rounded-full bg-[var(--sage)] p-1 text-white" size={20}/><div><p className="text-sm font-semibold">趋势研究</p><p className="text-xs text-[var(--muted)]">已完成 · 10:24</p></div></div>
          <div className="flex gap-3"><Clock3 className="mt-0.5 rounded-full bg-[var(--almond)] p-1" size={20}/><div><p className="text-sm font-semibold">内容初稿</p><p className="text-xs text-[var(--muted)]">预计 14:30</p></div></div>
        </div>
      </aside>
    </section>

    <section className="mt-12">
      <div className="flex items-end justify-between"><div><p className="fine">Your creative crew</p><h2 className="font-display mt-2 text-3xl">我的 AI 内容团队</h2></div><Link href="/workflow" className="hidden text-sm font-semibold sm:block">查看工作流 →</Link></div>
      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{agents.map((agent,i)=><AgentCard key={agent.id} agent={agent} featured={i===0}/>)}</div>
    </section>
  </main>;
}

function SparkleCluster() { return <div aria-hidden className="absolute right-12 top-10 hidden sm:block"><div className="h-3 w-3 rotate-45 bg-white/70"/><div className="ml-12 mt-10 h-2 w-2 rotate-45 bg-white/50"/><div className="-ml-8 mt-12 h-4 w-4 rotate-45 border border-white/50"/></div>; }
