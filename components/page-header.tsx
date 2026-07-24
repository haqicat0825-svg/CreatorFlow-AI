export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="fine mb-3">{eyebrow}</p><h1 className="font-display text-4xl leading-none sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p></div>
    {action}
  </header>;
}
