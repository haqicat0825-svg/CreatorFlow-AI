import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  ImageIcon,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const agents = [
  { name: "Research Agent", role: "发现内容趋势与参考素材", icon: Search },
  { name: "Trend Analysis Agent", role: "归纳信号、用户画像与机会点", icon: BarChart3 },
  { name: "Writer Agent", role: "生成标题、正文与标签候选", icon: FileText },
  { name: "Visual Agent", role: "将内容方向转化为封面候选", icon: ImageIcon },
  { name: "Human Review", role: "确认事实、品牌表达与发布决策", icon: UserCheck },
];

const currentCapabilities = [
  "研究结果选择与趋势分析",
  "基于 Content Brief 的内容生成",
  "AI 封面候选与人工选择",
  "草稿编辑、审核与发布状态管理",
];

const roadmap = [
  "跨平台内容表现反馈闭环",
  "团队协作、权限与审核记录",
  "可复用的品牌策略与长期记忆",
  "更完整的生产级数据与发布基础设施",
];

export function ProductThinking() {
  return (
    <main className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
      <PageHeader
        eyebrow="Product thinking"
        title="CreatorFlow AI 产品思考"
        description="从内容运营的真实摩擦出发，设计一个由 AI Agent 协作、由人类持续把关的内容运营工作流。"
      />

      <section className="panel mt-10 overflow-hidden p-6 sm:p-8" aria-labelledby="pain-points-title">
        <SectionTitle number="01" title="用户痛点" id="pain-points-title" icon={Lightbulb} />
        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="rounded-2xl bg-[var(--cream)] p-5">
            <p className="text-xs font-bold text-[var(--muted)]">传统内容运营流程</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {["找选题", "查资料", "写内容", "做封面", "反复审核"].map((item, index, items) => (
                <span key={item} className="contents">
                  <span className="rounded-xl bg-white/70 px-3 py-2">{item}</span>
                  {index < items.length - 1 && <ArrowRight size={14} className="text-[var(--muted)]" aria-hidden="true" />}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden w-px bg-[var(--line)] lg:block" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["工具割裂", "研究、写作、设计与草稿分散，信息需要重复搬运。"],
              ["决策成本高", "趋势很多，但难以判断哪些与账号定位真正相关。"],
              ["复用效率低", "优质案例和品牌偏好难以沉淀为下一次创作输入。"],
              ["质量不可控", "只追求自动生成，容易忽略事实、品牌一致性与发布风险。"],
            ].map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel !bg-[var(--rose)] p-6 sm:p-8" aria-labelledby="positioning-title">
          <SectionTitle number="02" title="产品定位" id="positioning-title" icon={Target} />
          <p className="font-display mt-8 text-4xl leading-tight sm:text-5xl">AI 内容运营工作流</p>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--ink)]/70">
            CreatorFlow AI 不是单点文案工具，而是把研究、分析、写作、视觉和人工审核串联起来，让每一步都有清晰输入、输出与决策责任。
          </p>
        </div>
        <div className="panel p-6 sm:p-8">
          <p className="fine">Product hypothesis</p>
          <h2 className="mt-3 text-xl font-bold">核心产品假设</h2>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            当趋势证据、内容策略和创作结果处于同一工作流中，内容团队可以减少重复操作，把更多时间用于判断“为什么做”和“是否值得发布”。
          </p>
        </div>
      </section>

      <section className="panel mt-6 p-6 sm:p-8" aria-labelledby="architecture-title">
        <SectionTitle number="03" title="Agent 架构" id="architecture-title" icon={Sparkles} />
        <div className="mt-7 grid gap-3 md:grid-cols-5">
          {agents.map(({ name, role, icon: Icon }, index) => (
            <article key={name} className="relative rounded-2xl bg-[var(--cream)] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--almond)]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold">{name}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{role}</p>
              {index < agents.length - 1 && (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-[var(--paper)] p-1 text-[var(--rose-deep)] md:block" size={21} aria-hidden="true" />
              )}
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Agent 负责结构化协作，不代表无人值守自动执行；关键输入选择、结果确认和发布决定始终由人完成。
        </p>
      </section>

      <section className="panel mt-6 overflow-hidden p-6 sm:p-8" aria-labelledby="principles-title">
        <SectionTitle number="04" title="产品原则" id="principles-title" icon={ShieldCheck} />
        <div className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-2xl bg-[var(--ink)] p-6 text-white">
            <UserCheck size={26} aria-hidden="true" />
            <p className="font-display mt-7 text-3xl">Human-in-the-loop</p>
            <p className="mt-3 text-sm leading-6 text-white/65">AI 辅助决策，而不是完全替代人工。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Principle icon={Eye} title="可见">呈现来源、上下文与当前状态，让人知道 AI 基于什么工作。</Principle>
            <Principle icon={UserCheck} title="可选择">研究结果、内容方向和封面候选都保留明确的人类选择。</Principle>
            <Principle icon={ShieldCheck} title="可审核">草稿先进入人工审核，再决定是否进入发布流程。</Principle>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2" aria-labelledby="capability-title">
        <div className="panel p-6 sm:p-8">
          <SectionTitle number="05" title="当前能力" id="capability-title" icon={CheckCircle2} />
          <ul className="mt-7 space-y-3">
            {currentCapabilities.map(item => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-[var(--cream)] px-4 py-3 text-sm font-semibold">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--sage)]" size={17} aria-hidden="true" />{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-6 sm:p-8">
          <SectionTitle number="06" title="未来规划" id="roadmap-title" icon={Sparkles} />
          <ol className="mt-7 space-y-3">
            {roadmap.map((item, index) => (
              <li key={item} className="flex items-center gap-4 border-b border-[var(--line)] pb-3 text-sm font-semibold last:border-0">
                <span className="font-display text-2xl text-[var(--rose-deep)]">0{index + 1}</span>{item}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">以上为产品路线规划，不代表当前版本已经具备。</p>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ number, title, id, icon: Icon }: {
  number: string;
  title: string;
  id: string;
  icon: typeof Search;
}) {
  return <div className="mb-6 flex items-center gap-4">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--almond)]"><Icon size={19} aria-hidden="true" /></span>
    <div><p className="fine">Section {number}</p><h2 id={id} className="mt-1 text-xl font-bold">{title}</h2></div>
  </div>;
}

function Principle({ icon: Icon, title, children }: { icon: typeof Search; title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl bg-[var(--cream)] p-5">
    <Icon className="text-[var(--rose-deep)]" size={19} aria-hidden="true" />
    <h3 className="mt-4 text-sm font-bold">{title}</h3>
    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{children}</p>
  </article>;
}
