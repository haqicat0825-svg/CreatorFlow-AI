export function StatusPill({ status }: { status: "working" | "ready" | "waiting" }) {
  const label = { working: "Working", ready: "Ready", waiting: "Waiting" }[status];
  const color = { working: "bg-[var(--apricot)]", ready: "bg-[var(--sage)]", waiting: "bg-[#c7bfba]" }[status];
  return <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-3 py-1.5 text-xs font-semibold"><span className={`h-2 w-2 rounded-full ${color} ${status === "working" ? "status-pulse" : ""}`}/>{label}</span>;
}
