export function segmentedControlClass(selected: boolean) {
  return [
    "rounded-full border px-4 py-2 text-sm font-semibold transition",
    selected
      ? "segmented-control-selected border-[var(--rose)] bg-[var(--rose)]/25 shadow-sm"
      : "border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-[var(--cream)]",
  ].join(" ");
}
