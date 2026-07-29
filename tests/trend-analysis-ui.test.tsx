import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchLibrary } from "@/components/research-library";
import type { TopicCandidate, TrendAnalysisResult } from "@/lib/analysis/types";

const results = [
  {
    id: "result-1",
    title: "Evidence one",
    summary: "First evidence summary",
    sourceUrl: "https://example.com/one",
    tags: ["trend"],
    source: "tavily" as const,
    retrievedAt: "2026-07-26T00:00:00.000Z",
    isMock: false,
  },
  {
    id: "result-2",
    title: "Evidence two",
    summary: "Second evidence summary",
    sourceUrl: "https://example.com/two",
    tags: ["audience"],
    source: "tavily" as const,
    retrievedAt: "2026-07-26T00:00:00.000Z",
    isMock: false,
  },
  {
    id: "result-3",
    title: "Evidence three",
    summary: "Third evidence summary",
    sourceUrl: "https://example.com/three",
    tags: ["engagement"],
    source: "tavily" as const,
    retrievedAt: "2026-07-26T00:00:00.000Z",
    isMock: false,
  },
];

const analysis: TrendAnalysisResult = {
  executiveSummary: "Creator education is gaining momentum.",
  trendSignals: [{ signal: "Tutorial demand is rising.", confidence: 0.86, evidenceResultIds: ["result-1"] }],
  viralElements: {
    colors: ["奶油白", "灰粉"],
    items: ["针织衫", "半裙"],
    styles: ["Clean Fit"],
    evidenceResultIds: ["result-1"],
  },
  audienceProfile: {
    ageRange: "18-25岁",
    needs: ["低成本复刻博主穿搭"],
    evidenceResultIds: ["result-1"],
  },
  audienceInsights: [{ insight: "New creators want practical guidance.", evidenceResultIds: ["result-1"] }],
  viralReasons: [{ reason: "Practical lists encourage saves.", evidenceResultIds: ["result-1"] }],
  topicCandidates: Array.from({ length: 10 }, (_, index) => ({
    title: index === 0 ? "A seven-day creator workflow" : `Creator topic ${index + 1}`,
    angle: `Turn research into repeatable system ${index + 1}.`,
    rationale: "The selected evidence supports demand for practical tutorials.",
    evidenceResultIds: ["result-1"],
  })),
  cautions: [{ caution: "The evidence set is small.", evidenceResultIds: ["result-1"] }],
  sourceReferences: [{
    resultId: "result-1",
    title: "Evidence one",
    sourceUrl: "https://example.com/one",
  }],
  metadata: {
    provider: "mock",
    model: "CreatorFlow Trend Demo",
    generatedAt: "2026-07-26T00:00:00.000Z",
    inputResultCount: 1,
    schemaVersion: "1",
    isMock: true,
  },
};

function response(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
}

function installFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("/api/research/status")) {
      return response({ available: true, loggedIn: true, provider: "tavily", safeMessage: "Tavily 可用。" });
    }
    if (url.endsWith("/api/research/search")) return response(results);
    if (url.endsWith("/api/research/analyze")) return response(analysis);
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("输入关键词后手动搜索"), "creator trends");
  await user.click(screen.getByRole("button", { name: "搜索" }));
  await screen.findByText("Evidence one");
}

async function selectMinimumEvidence(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("checkbox", { name: /Evidence one/ }));
  await user.click(screen.getByRole("checkbox", { name: /Evidence two/ }));
  await user.click(screen.getByRole("checkbox", { name: /Evidence three/ }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Trend Analysis UI", () => {
  it("does not allow analysis without selected results", async () => {
    installFetch();
    const user = userEvent.setup();
    render(<ResearchLibrary />);
    await search(user);

    expect(screen.getByRole("button", { name: "分析趋势" })).toBeDisabled();
  });

  it("shows a successful analysis with no topic selected by default", async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<ResearchLibrary />);
    await search(user);
    await selectMinimumEvidence(user);
    await user.click(screen.getByRole("button", { name: "分析趋势" }));

    expect(await screen.findByText(analysis.executiveSummary)).toBeInTheDocument();
    expect(screen.getByText("Tutorial demand is rising.")).toBeInTheDocument();
    expect(screen.getByText("New creators want practical guidance.")).toBeInTheDocument();
    expect(screen.getByText(/奶油白、灰粉/)).toBeInTheDocument();
    expect(screen.getByText(/18-25岁/)).toBeInTheDocument();
    expect(screen.getByText("Practical lists encourage saves.")).toBeInTheDocument();
    expect(screen.getByText("The evidence set is small.")).toBeInTheDocument();
    expect(screen.getByText("DEMO / MOCK")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A seven-day creator workflow/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "基于趋势生成内容" })).toBeDisabled();
    const analyzeCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/research/analyze"));
    expect(analyzeCall?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "creator trends", selectedResults: results }),
    });
  });

  it("selects a candidate and only invokes the callback", async () => {
    const onUseTopic = vi.fn<(topic: TopicCandidate, result: TrendAnalysisResult) => void>();
    installFetch();
    const user = userEvent.setup();
    render(<ResearchLibrary onUseTopic={onUseTopic} />);
    await search(user);
    await selectMinimumEvidence(user);
    await user.click(screen.getByRole("button", { name: "分析趋势" }));
    await user.click(await screen.findByRole("button", { name: /A seven-day creator workflow/ }));

    expect(screen.getByRole("button", { name: /A seven-day creator workflow/ })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.pathname).toBe("/");
    await user.click(screen.getByRole("button", { name: "基于趋势生成内容" }));
    expect(onUseTopic).toHaveBeenCalledWith(analysis.topicCandidates[0], analysis);
    expect(window.location.pathname).toBe("/");
  });

  it("clears the old analysis when evidence changes", async () => {
    installFetch();
    const user = userEvent.setup();
    render(<ResearchLibrary />);
    await search(user);
    await selectMinimumEvidence(user);
    await user.click(screen.getByRole("button", { name: "分析趋势" }));
    expect(await screen.findByText(analysis.executiveSummary)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Evidence two/ }));
    await waitFor(() => expect(screen.queryByText(analysis.executiveSummary)).not.toBeInTheDocument());
  });
});
