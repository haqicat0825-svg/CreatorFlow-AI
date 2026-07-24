"use client";
import { Bookmark, Flame } from "lucide-react";
import type { LibraryItem } from "@/lib/types";

export function ContentCard({ item, saved, onToggleSave, onOpen }: { item: LibraryItem; saved: boolean; onToggleSave: () => void; onOpen: () => void }) {
  const heights = { square:"aspect-square", portrait:"aspect-[4/5]", tall:"aspect-[3/4]" };
  return <article data-testid="content-card" data-category={item.category} className="group overflow-hidden rounded-[25px] border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow)]">
    <button onClick={onOpen} className={`visual-art block w-full ${heights[item.aspect]}`} style={{"--art-a":item.colors[0],"--art-b":item.colors[1],"--art-c":item.colors[2]} as React.CSSProperties} aria-label={`查看 ${item.title}`}>
      <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold backdrop-blur"><Flame size={12} fill="currentColor"/> {item.score}</span>
    </button>
    <div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">{item.category}</p><h3 className="mt-1 font-bold leading-snug">{item.title}</h3></div><button aria-label={saved?"取消收藏":"收藏"} onClick={onToggleSave} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${saved?"bg-[var(--rose)]":"bg-[var(--cream)]"}`}><Bookmark size={16} fill={saved?"currentColor":"none"}/></button></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.map(t=><span key={t} className="rounded-full bg-[var(--cream)] px-2.5 py-1 text-[10px] text-[var(--muted)]">{t}</span>)}</div></div>
  </article>;
}
