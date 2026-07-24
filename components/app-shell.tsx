"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Cpu, House, Images, Network, PenLine, Sparkles, UserRound } from "lucide-react";

const nav = [
  { href: "/", label: "首页", icon: House },
  { href: "/library", label: "内容资产", icon: Images },
  { href: "/workflow", label: "Agent 流程", icon: Network },
  { href: "/creator", label: "内容创作", icon: PenLine },
  { href: "/visual-studio", label: "视觉工作室", icon: Sparkles },
  { href: "/models", label: "Model Hub", icon: Cpu },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-[var(--line)] bg-[rgba(255,253,249,.86)] py-6 backdrop-blur-xl md:flex">
        <Link href="/" aria-label="CreatorFlow AI 首页" className="mb-10 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ink)] text-white shadow-lg"><Bot size={22}/></Link>
        <nav className="flex flex-1 flex-col gap-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} aria-label={label} title={label} className={`grid h-12 w-12 place-items-center rounded-2xl transition ${active ? "bg-[var(--rose)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--almond)]"}`}><Icon size={20}/></Link>;
          })}
        </nav>
        <button aria-label="用户账户" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white"><UserRound size={18}/></button>
      </aside>
      <div className="min-h-screen pb-24 md:ml-[88px] md:pb-0">{children}</div>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-start gap-2 overflow-x-auto rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,249,.94)] p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} aria-label={label} className={`grid h-11 min-w-11 place-items-center rounded-2xl ${active ? "bg-[var(--rose)]" : "text-[var(--muted)]"}`}><Icon size={19}/></Link>;
        })}
      </nav>
    </div>
  );
}
