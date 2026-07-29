import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  FileText,
  ImageIcon,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { DASHBOARD_DEMO_SHOWCASE } from "@/lib/dashboard/demo-showcase";

const demo = DASHBOARD_DEMO_SHOWCASE;

export function DemoShowcase() {
  return (
    <main className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
      <header className="panel relative overflow-hidden !bg-[var(--rose)] p-7 sm:p-10">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/45 px-3 py-1.5 text-xs font-bold">
            <Sparkles size={14} aria-hidden="true" />
            {demo.label}
          </div>
          <p className="fine mt-7 !text-[var(--ink)]/60">CreatorFlow AI · End-to-end showcase</p>
          <h1 className="font-display mt-3 text-4xl leading-tight sm:text-6xl">{demo.theme}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink)]/70">
            以下内容为固定演示数据，用于展示 AI 内容运营流程，不代表真实账号数据，也不会写入工作台或触发任何真实任务。
          </p>
        </div>
        <div className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full border-[48px] border-white/20" />
      </header>

      <div className="mt-8 space-y-6">
        <DemoSection number="01" title="Research Agent" icon={Search}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="研究关键词" value={demo.research.keyword} />
            <Metric label="发现趋势" value={`${demo.research.trendCount} 个`} />
            <Metric label="参考结果" value={`${demo.research.searchResultCount} 条`} />
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold text-[var(--muted)]">热门方向</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {demo.research.hotTrends.map(item => <Tag key={item}>{item}</Tag>)}
            </div>
          </div>
        </DemoSection>

        <DemoSection number="02" title="Trend Analysis Agent" icon={BarChart3}>
          <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
            <div className="rounded-2xl bg-[var(--cream)] p-5">
              <p className="text-xs font-bold text-[var(--muted)]">趋势主题</p>
              <p className="mt-2 text-xl font-bold">{demo.analysis.trendTheme}</p>
              <p className="mt-5 text-xs font-bold text-[var(--muted)]">热度评分</p>
              <p className="font-display mt-1 text-5xl text-[var(--rose-deep)]">{demo.analysis.heatScore}</p>
            </div>
            <div className="space-y-4">
              <Insight icon={UserRound} label="用户画像">{demo.analysis.audience}</Insight>
              <Insight icon={Sparkles} label="机会点">
                <ul className="space-y-2">
                  {demo.analysis.opportunities.map(item => <li key={item}>• {item}</li>)}
                </ul>
              </Insight>
            </div>
          </div>
        </DemoSection>

        <DemoSection number="03" title="Writer Agent" icon={FileText}>
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="text-xs font-bold text-[var(--muted)]">标题候选</p>
              <ol className="mt-3 space-y-3">
                {demo.writer.titleCandidates.map((title, index) => (
                  <li key={title} className="flex gap-3 rounded-2xl bg-[var(--cream)] p-4 text-sm font-semibold">
                    <span className="text-[var(--rose-deep)]">0{index + 1}</span>{title}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-5">
              <p className="text-xs font-bold text-[var(--muted)]">正文示例</p>
              <h3 className="mt-3 text-lg font-bold">{demo.writer.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{demo.writer.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {demo.writer.tags.map(tag => <Tag key={tag}>#{tag}</Tag>)}
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection number="04" title="Visual Agent" icon={ImageIcon}>
          <div className="grid items-center gap-6 lg:grid-cols-[300px_1fr]">
            <div
              role="img"
              aria-label="韩系通勤 AI 封面示例图片"
              className="visual-art aspect-[3/4] overflow-hidden rounded-[24px]"
              style={{
                "--art-a": demo.visual.palette[0],
                "--art-b": demo.visual.palette[1],
                "--art-c": demo.visual.palette[2],
              } as React.CSSProperties}
            >
              <div className="absolute inset-x-5 bottom-5 z-10 rounded-2xl bg-white/80 p-4 backdrop-blur-md">
                <p className="fine">{demo.visual.coverSubtitle}</p>
                <p className="font-display mt-1 text-3xl">{demo.visual.coverTitle}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--muted)]">AI 封面示例图片</p>
              <h3 className="font-display mt-2 text-3xl">低饱和、自然光、杂志感</h3>
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-[var(--cream)] px-5 py-4">
                <Sparkles size={18} aria-hidden="true" />
                <div><p className="text-xs text-[var(--muted)]">模型</p><p className="font-bold">{demo.visual.model}</p></div>
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection number="05" title="Draft Studio" icon={FileCheck2}>
          <div className="flex flex-col justify-between gap-5 rounded-2xl bg-[var(--cream)] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold text-[var(--muted)]">草稿状态</p>
              <p className="mt-2 text-xl font-bold">{demo.writer.title}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">文案与 AI 封面已组合，等待人工确认。</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--almond)] px-4 py-2 text-sm font-bold">
              <CheckCircle2 size={16} aria-hidden="true" />{demo.draft.reviewStatus}
            </span>
          </div>
        </DemoSection>
      </div>
    </main>
  );
}

function DemoSection({ number, title, icon: Icon, children }: {
  number: string;
  title: string;
  icon: typeof Search;
  children: React.ReactNode;
}) {
  return <section className="panel p-6 sm:p-8">
    <div className="mb-6 flex items-center gap-4 border-b border-[var(--line)] pb-5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--almond)]"><Icon size={19} aria-hidden="true" /></span>
      <div><p className="fine">Step {number}</p><h2 className="mt-1 text-xl font-bold">{title}</h2></div>
    </div>
    {children}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[var(--cream)] p-5"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

function Insight({ icon: Icon, label, children }: { icon: typeof Search; label: string; children: React.ReactNode }) {
  return <div className="flex gap-4 rounded-2xl bg-[var(--cream)] p-5"><Icon className="mt-0.5 shrink-0 text-[var(--rose-deep)]" size={18} aria-hidden="true" /><div><p className="text-xs font-bold text-[var(--muted)]">{label}</p><div className="mt-2 text-sm leading-6">{children}</div></div></div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--almond)]/65 px-3 py-1.5 text-xs font-bold">{children}</span>;
}
