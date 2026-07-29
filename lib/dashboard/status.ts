import type { TrendAnalysisResult } from "@/lib/analysis/types";
import { loadDrafts } from "@/lib/content/draft-storage";
import { readCurrentCreatorState } from "@/lib/content/execution-state";
import { DASHBOARD_DEMO_SHOWCASE, type DemoShowcase } from "./demo-showcase";

export const DASHBOARD_ACTIVITY_STORAGE_KEY = "creatorflow-dashboard-activity";
export const DASHBOARD_ACTIVITY_EVENT = "creatorflow:dashboard-updated";

type DashboardStorage = Pick<Storage, "getItem">;
type WritableDashboardStorage = Pick<Storage, "getItem" | "setItem">;

type TrendActivity = {
  schemaVersion: "1";
  generatedAt: string;
  discoveredCount: number;
  analyzedCount: number;
  topic: string;
};

export type DashboardTaskStatus = "生成中" | "待审核" | "已完成";

export type DashboardTask = {
  id: string;
  title: string;
  type: "趋势分析" | "内容生成" | "AI 图片";
  status: DashboardTaskStatus;
  updatedAt: string;
};

export type DashboardStatus = {
  currentTopic: string;
  hasTask: boolean;
  isGenerating: boolean;
  isMock: boolean;
  demoCase?: DemoShowcase;
  metrics: {
    trends: number;
    analyzedTrends: number;
    contents: number;
    images: number;
    pendingReview: number;
  };
  recentTasks: DashboardTask[];
};

const MOCK_STATUS: DashboardStatus = {
  currentTopic: DASHBOARD_DEMO_SHOWCASE.theme,
  hasTask: false,
  isGenerating: false,
  isMock: true,
  demoCase: DASHBOARD_DEMO_SHOWCASE,
  metrics: {
    trends: 12,
    analyzedTrends: 5,
    contents: 4,
    images: 6,
    pendingReview: 2,
  },
  recentTasks: [
    { id: "mock-1", title: "夏日通勤穿搭趋势", type: "趋势分析", status: "已完成", updatedAt: "今天 10:30" },
    { id: "mock-2", title: "低饱和通勤穿搭指南", type: "内容生成", status: "待审核", updatedAt: "今天 09:45" },
    { id: "mock-3", title: "极简风穿搭封面", type: "AI 图片", status: "已完成", updatedAt: "昨天 18:20" },
  ],
};

export function readDashboardStatus(
  localStorage: DashboardStorage,
  sessionStorage: DashboardStorage,
  now = new Date(),
): DashboardStatus {
  const { task, execution } = readCurrentCreatorState(sessionStorage);
  const allDrafts = loadDrafts(localStorage);
  const todayDrafts = allDrafts.filter(draft => isSameLocalDay(draft.createdAt, now));
  const trendActivity = readTrendActivity(localStorage);
  const currentTrendActivity = trendActivity && isSameLocalDay(trendActivity.generatedAt, now)
    ? trendActivity
    : null;
  const taskTrendContext = task?.trendContext && isSameLocalDay(task.trendContext.metadata.generatedAt, now)
    ? task.trendContext
    : null;

  const trends = currentTrendActivity?.discoveredCount
    ?? taskTrendContext?.sourceReferences.length
    ?? 0;
  const analyzedTrends = currentTrendActivity?.analyzedCount
    ?? taskTrendContext?.trendSignals.length
    ?? 0;
  const images = new Set(todayDrafts.flatMap(draft => draft.images).filter(Boolean)).size;

  const recentTasks: DashboardTask[] = [];
  if (execution) {
    recentTasks.push({
      id: `execution-${execution.topic}`,
      title: execution.title?.trim() || execution.topic,
      type: "内容生成",
      status: execution.status === "generating"
        ? "生成中"
        : execution.status === "completed" ? "已完成" : "待审核",
      updatedAt: execution.updatedAt,
    });
  }
  if (trendActivity) {
    recentTasks.push({
      id: `trend-${trendActivity.generatedAt}`,
      title: trendActivity.topic,
      type: "趋势分析",
      status: "已完成",
      updatedAt: trendActivity.generatedAt,
    });
  }
  for (const draft of allDrafts) {
    recentTasks.push({
      id: draft.id,
      title: draft.title.trim() || "未命名草稿",
      type: draft.images.length > 0 && !draft.content.trim() ? "AI 图片" : "内容生成",
      status: draft.publishStatus === "published" || draft.publishStatus === "ready_to_publish"
        ? "已完成"
        : "待审核",
      updatedAt: draft.createdAt,
    });
  }

  const hasRealData = Boolean(task || execution || trendActivity || allDrafts.length);
  if (!hasRealData) return MOCK_STATUS;

  return {
    currentTopic: task?.brief.topic ?? recentTasks[0]?.title ?? "等待创建内容任务",
    hasTask: Boolean(task),
    isGenerating: execution?.status === "generating",
    isMock: false,
    metrics: {
      trends,
      analyzedTrends,
      contents: todayDrafts.length,
      images,
      pendingReview: allDrafts.filter(draft => draft.publishStatus === "reviewing").length,
    },
    recentTasks: recentTasks
      .sort((a, b) => parseTaskTime(b.updatedAt) - parseTaskTime(a.updatedAt))
      .filter((item, index, items) => items.findIndex(candidate => candidate.title === item.title && candidate.type === item.type) === index)
      .slice(0, 5),
  };
}

export function recordTrendAnalysis(
  storage: WritableDashboardStorage,
  result: TrendAnalysisResult,
) {
  const activity: TrendActivity = {
    schemaVersion: "1",
    generatedAt: result.metadata.generatedAt,
    discoveredCount: result.sourceReferences.length,
    analyzedCount: result.trendSignals.length,
    topic: result.topicCandidates[0]?.title ?? result.executiveSummary,
  };
  storage.setItem(DASHBOARD_ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DASHBOARD_ACTIVITY_EVENT));
  }
}

function readTrendActivity(storage: DashboardStorage): TrendActivity | null {
  const raw = storage.getItem(DASHBOARD_ACTIVITY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TrendActivity> & { trendCount?: number };
    const analyzedCount = value.analyzedCount ?? value.trendCount;
    const discoveredCount = value.discoveredCount ?? analyzedCount;
    if (
      value.schemaVersion !== "1"
      || typeof value.generatedAt !== "string"
      || !isNonNegativeInteger(discoveredCount)
      || !isNonNegativeInteger(analyzedCount)
      || typeof value.topic !== "string"
    ) {
      return null;
    }
    return {
      schemaVersion: "1",
      generatedAt: value.generatedAt,
      discoveredCount,
      analyzedCount,
      topic: value.topic,
    };
  } catch {
    return null;
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseTaskTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isSameLocalDay(value: string, now: Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}
