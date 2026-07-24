"use client";
import { Check } from "lucide-react";

export function TagSelector({ options, selected, onChange, single = false }: { options: string[]; selected: string[]; onChange: (value: string[]) => void; single?: boolean }) {
  const toggle = (option: string) => {
    if (single) return onChange([option]);
    onChange(selected.includes(option) ? selected.filter(v => v !== option) : [...selected, option]);
  };
  return <div className="flex flex-wrap gap-2">{options.map(option => {
    const active = selected.includes(option);
    return <button key={option} type="button" aria-pressed={active} onClick={() => toggle(option)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${active ? "border-[var(--rose-deep)] bg-[var(--rose)]/30" : "border-[var(--line)] bg-white/55 hover:border-[var(--rose)]"}`}>{active && <Check size={14}/>} {option}</button>;
  })}</div>;
}
