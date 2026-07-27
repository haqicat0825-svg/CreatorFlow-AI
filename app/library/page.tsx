"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KnowledgeLibrary } from "@/components/knowledge-library";
import { ResearchLibrary } from "@/components/research-library";
import type { KnowledgeCategory } from "@/lib/knowledge/types";
import type { TopicCandidate, TrendAnalysisResult } from "@/lib/analysis/types";
import { storeTrendSelectionForCreator } from "@/lib/content/task-envelope";
import { segmentedControlClass } from "@/lib/ui/segmented-control";

const cats = ["全部","Content Knowledge","Hot Content Library","个人审美风格库","爆款标题模板库","AI图片库"] as const;
const categoryMap: Record<(typeof cats)[number], KnowledgeCategory | undefined> = {
  "全部": undefined,
  "Content Knowledge": "content_knowledge",
  "Hot Content Library": "xiaohongshu_case",
  "个人审美风格库": "style_preference",
  "爆款标题模板库": "title_template",
  "AI图片库": "ai_image",
};
export default function LibraryPage() {
  const router = useRouter();
  const [category,setCategory]=useState<(typeof cats)[number]>("全部");
  const [query,setQuery]=useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("category") === "ai_image") setCategory("AI图片库");
  }, []);
  const useTopic = (topic: TopicCandidate, result: TrendAnalysisResult) => {
    const destination = storeTrendSelectionForCreator(
      window.sessionStorage,
      result,
      topic,
    );
    router.push(destination);
  };
  return <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="AI Content Assets" title="Content Intelligence Library" description="把灵感、爆款结构和个人风格整理成可被 AI 团队反复使用的内容记忆。"/>
    <ResearchLibrary onUseTopic={useTopic}/>
    <div className="mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">{cats.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)} className={`whitespace-nowrap ${segmentedControlClass(category===c)}`}>{c}</button>)}</div>
      <label className="flex min-w-[290px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索标题或 AI 标签" className="w-full bg-transparent text-sm outline-none"/><SlidersHorizontal size={15}/></label>
    </div>
    <KnowledgeLibrary category={categoryMap[category]} query={query}/>
  </main>;
}
