"use client";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ContentCard } from "@/components/content-card";
import { PageHeader } from "@/components/page-header";
import { KnowledgeLibrary } from "@/components/knowledge-library";
import { ResearchLibrary } from "@/components/research-library";
import { libraryItems } from "@/data/mock";
import type { LibraryItem } from "@/lib/types";

const cats = ["全部","爆款案例","我的风格","标题公式","视觉素材"] as const;
export default function LibraryPage() {
  const [category,setCategory]=useState<(typeof cats)[number]>("全部");
  const [query,setQuery]=useState("");
  const [saved,setSaved]=useState(()=>new Set(libraryItems.filter(i=>i.saved).map(i=>i.id)));
  const [selected,setSelected]=useState<LibraryItem|null>(null);
  const filtered=useMemo(()=>libraryItems.filter(i=>(category==="全部"||i.category===category)&&(`${i.title} ${i.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()))),[category,query]);
  const toggle=(id:string)=>setSaved(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next});
  return <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="AI Content Assets" title="Content Intelligence Library" description="把灵感、爆款结构和个人风格整理成可被 AI 团队反复使用的内容记忆。"/>
    <ResearchLibrary/>
    <KnowledgeLibrary/>
    <div className="mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-2 overflow-x-auto pb-1">{cats.map(c=><button key={c} onClick={()=>setCategory(c)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category===c?"bg-[var(--ink)] text-white":"border border-[var(--line)] bg-white/60"}`}>{c}</button>)}</div>
      <label className="flex min-w-[290px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索标题或 AI 标签" className="w-full bg-transparent text-sm outline-none"/><SlidersHorizontal size={15}/></label>
    </div>
    <section className="masonry mt-7">{filtered.map(item=><ContentCard key={item.id} item={item} saved={saved.has(item.id)} onToggleSave={()=>toggle(item.id)} onOpen={()=>setSelected(item)}/>)}</section>
    {!filtered.length&&<div className="panel mt-8 p-12 text-center text-[var(--muted)]">没有找到匹配内容，试试另一个关键词。</div>}
    {selected&&<div className="fixed inset-0 z-50 bg-[var(--ink)]/20 backdrop-blur-sm" onMouseDown={()=>setSelected(null)}><aside onMouseDown={e=>e.stopPropagation()} className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-[var(--paper)] p-6 shadow-2xl"><button aria-label="关闭详情" onClick={()=>setSelected(null)} className="float-right grid h-10 w-10 place-items-center rounded-full bg-[var(--cream)]"><X/></button><div className="visual-art mt-14 aspect-[4/5] rounded-[28px]" style={{"--art-a":selected.colors[0],"--art-b":selected.colors[1],"--art-c":selected.colors[2]} as React.CSSProperties}/><p className="fine mt-6">{selected.category}</p><h2 className="font-display mt-2 text-3xl">{selected.title}</h2><p className="mt-4 text-sm leading-6 text-[var(--muted)]">AI 分析显示，这个案例在配色、场景与标题节奏上与你的个人风格高度匹配。</p></aside></div>}
  </main>;
}
