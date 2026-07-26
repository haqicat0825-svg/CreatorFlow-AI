"use client";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TagSelector } from "@/components/tag-selector";
import {
  CREATOR_TASK_STORAGE_KEY,
  PENDING_TREND_SELECTION_STORAGE_KEY,
  parsePendingTrendSelection,
  type PendingTrendSelection,
} from "@/lib/content/task-envelope";
import type { ContentGoal, ContentTask } from "@/lib/types";

const audiences = ["18-25岁女生", "学生党", "职场女性", "穿搭爱好者"];
const styles = ["韩系甜美", "清冷感", "高级感", "日系", "复古"];
const goals: ContentGoal[] = ["涨粉", "种草", "品牌推广"];

export default function CreateTaskPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("秋季韩系穿搭");
  const [selectedAudiences, setAudiences] = useState(["18-25岁女生"]);
  const [selectedStyles, setStyles] = useState(["韩系甜美"]);
  const [goal, setGoal] = useState<ContentGoal>("种草");
  const [useIntelligence, setUseIntelligence] = useState(true);
  const [error, setError] = useState("");
  const [pendingTrend, setPendingTrend] = useState<PendingTrendSelection>();

  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_TREND_SELECTION_STORAGE_KEY);
    if (!stored) return;
    try {
      const pending = parsePendingTrendSelection(stored);
      setPendingTrend(pending);
      setTopic(pending.topic);
      setAudiences([]);
      setStyles([]);
    } catch {
      sessionStorage.removeItem(PENDING_TREND_SELECTION_STORAGE_KEY);
    }
  }, []);

  const submit = () => {
    if (!topic.trim()) return setError("请输入内容主题");
    if (!selectedAudiences.length || !selectedStyles.length) {
      return setError("请确认目标用户和内容风格");
    }
    const task: ContentTask = { topic: topic.trim(), audiences: selectedAudiences, styles: selectedStyles, goal, useIntelligence };
    sessionStorage.setItem(
      CREATOR_TASK_STORAGE_KEY,
      JSON.stringify(pendingTrend
        ? {
            schemaVersion: "1",
            brief: task,
            trendContext: pendingTrend.trendContext,
          }
        : task),
    );
    sessionStorage.removeItem(PENDING_TREND_SELECTION_STORAGE_KEY);
    router.push("/creator");
  };
  return <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="New content mission" title="Content Brief" description="给 AI 内容团队一份清晰的任务简报，它会决定研究方向、表达方式与最终审核标准。"/>
    <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="panel p-6 sm:p-8">
        <FieldTitle index="01" title="内容主题" description="一句话说清楚这次想做什么"/>
        <label className="mt-5 block"><input aria-label="内容主题" value={topic} onChange={e => { setTopic(e.target.value); setError(""); }} placeholder="例如：秋季韩系穿搭" className={`w-full rounded-[20px] border bg-[var(--cream)] px-5 py-4 text-lg font-semibold outline-none ${error ? "border-[var(--rose-deep)]" : "border-[var(--line)]"}`}/>{error && <span className="mt-2 block text-sm text-[var(--rose-deep)]">{error}</span>}</label>
        <Divider/>
        <FieldTitle index="02" title="目标用户" description="可多选，帮助 Agent 判断表达语气"/>
        <div className="mt-5"><TagSelector options={audiences} selected={selectedAudiences} onChange={setAudiences}/></div>
        <Divider/>
        <FieldTitle index="03" title="内容风格" description="选择这篇内容最重要的气质"/>
        <div className="mt-5"><TagSelector options={styles} selected={selectedStyles} onChange={setStyles}/></div>
        <Divider/>
        <FieldTitle index="04" title="内容目标" description="不同目标会影响标题与行动引导"/>
        <div className="mt-5"><TagSelector options={goals} selected={[goal]} onChange={v => setGoal(v[0] as ContentGoal)} single/></div>
      </section>
      <aside className="space-y-5">
        <div className="panel !bg-[var(--almond)] p-6"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/55"><BookOpen size={19}/></span><button role="switch" aria-checked={useIntelligence} aria-label="Use Content Intelligence" onClick={() => setUseIntelligence(v => !v)} className={`relative h-7 w-12 rounded-full transition ${useIntelligence ? "bg-[var(--ink)]" : "bg-white/70"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${useIntelligence ? "left-6" : "left-1"}`}/></button></div><h2 className="mt-5 font-bold">Use Content Intelligence</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">让 Agent 使用内容资产库中的爆款案例、个人风格与标题公式。</p></div>
        <div className="panel p-6"><p className="fine">Team ready</p><div className="mt-5 space-y-3 text-sm">{["Research Agent","Writer Agent","Visual Agent","Safety Guard"].map((name,i)=><div key={name} className="flex items-center justify-between"><span>{name}</span><span className={`h-2 w-2 rounded-full ${i===0?"status-pulse bg-[var(--apricot)]":"bg-[var(--sage)]"}`}/></div>)}</div></div>
        <button onClick={submit} className="primary-button flex w-full items-center justify-center gap-2 py-4"><Sparkles size={17}/>开始生成<ArrowRight size={16}/></button>
      </aside>
    </div>
  </main>;
}

function FieldTitle({ index, title, description }: { index: string; title: string; description: string }) { return <div className="flex gap-4"><span className="fine mt-1">{index}</span><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p></div></div>; }
function Divider() { return <div className="my-8 border-t border-[var(--line)]"/>; }
