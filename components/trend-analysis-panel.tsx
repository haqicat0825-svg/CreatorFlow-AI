"use client";

import { useEffect, useState } from "react";
import type { TopicCandidate, TrendAnalysisResult } from "@/lib/analysis/types";

type TrendAnalysisPanelProps = {
  result: TrendAnalysisResult;
  onUseTopic?: (topic: TopicCandidate, result: TrendAnalysisResult) => void;
};

export function TrendAnalysisPanel({ result, onUseTopic }: TrendAnalysisPanelProps) {
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const selectedTopic = selectedTopicIndex === null ? undefined : result.topicCandidates[selectedTopicIndex];

  useEffect(() => {
    setSelectedTopicIndex(null);
  }, [result]);

  return (
    <div className="border-t border-[var(--line)] bg-[var(--cream)]/35 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="fine">Evidence-backed analysis</p>
          <h3 className="mt-1 font-bold">趋势分析</h3>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${result.metadata.isMock ? "bg-[var(--almond)] text-[var(--ink)]" : "bg-green-100 text-green-800"}`}>
          {result.metadata.isMock ? "DEMO / MOCK" : "真实模型分析"}
        </span>
      </div>

      <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <h4 className="text-sm font-bold">执行摘要</h4>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{result.executiveSummary}</p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AnalysisList title="趋势信号">
          {result.trendSignals.map((item, index) => (
            <li key={`${item.signal}-${index}`}>
              <p>{item.signal}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">置信度 {Math.round(item.confidence * 100)}%</p>
            </li>
          ))}
        </AnalysisList>
        <AnalysisList title="受众洞察">
          {result.audienceInsights.map((item, index) => <li key={`${item.insight}-${index}`}>{item.insight}</li>)}
        </AnalysisList>
      </div>

      <section className="mt-4">
        <h4 className="text-sm font-bold">选题候选</h4>
        <p className="mt-1 text-xs text-[var(--muted)]">选择只保留在当前页面，不会自动进入 Creator。</p>
        <div className="mt-3 grid gap-3">
          {result.topicCandidates.map((topic, index) => {
            const isSelected = selectedTopicIndex === index;
            return (
              <button
                key={`${topic.title}-${index}`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTopicIndex(index)}
                className={`rounded-2xl border p-4 text-left transition ${isSelected ? "border-[var(--rose-deep)] bg-[var(--rose)]/15" : "border-[var(--line)] bg-white/70 hover:border-[var(--rose)]"}`}
              >
                <strong className="text-sm">{topic.title}</strong>
                <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{topic.angle}</span>
                <span className="mt-2 block text-xs leading-5">{topic.rationale}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!selectedTopic}
            onClick={() => selectedTopic && onUseTopic?.(selectedTopic, result)}
            className="primary-button disabled:cursor-not-allowed disabled:opacity-45"
          >
            使用此选题创作
          </button>
        </div>
      </section>

      <AnalysisList title="注意事项" className="mt-4">
        {result.cautions.map((item, index) => <li key={`${item.caution}-${index}`}>{item.caution}</li>)}
      </AnalysisList>
    </div>
  );
}

function AnalysisList({ title, className = "", children }: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-white/70 p-4 ${className}`}>
      <h4 className="text-sm font-bold">{title}</h4>
      <ul className="mt-3 space-y-3 text-xs leading-5">{children}</ul>
    </section>
  );
}
