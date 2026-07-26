import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LibraryPage from "@/app/library/page";
import { CREATOR_TASK_STORAGE_KEY } from "@/lib/content/task-envelope";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/knowledge-library", () => ({
  KnowledgeLibrary: () => null,
}));

vi.mock("@/components/research-library", () => ({
  ResearchLibrary: ({
    onUseTopic,
  }: {
    onUseTopic: (topic: unknown, analysis: unknown) => void;
  }) => {
    const selectedTopic = {
      title: "Selected creator workflow",
      angle: "Use practical steps.",
      rationale: "The selected evidence supports it.",
      evidenceResultIds: ["result-1"],
    };
    const analysis = {
      executiveSummary: "A complete analysis summary.",
      trendSignals: [{
        signal: "Selected signal",
        confidence: 0.9,
        evidenceResultIds: ["result-1"],
      }, {
        signal: "Unselected signal must not be stored",
        confidence: 0.8,
        evidenceResultIds: ["result-2"],
      }],
      audienceInsights: [],
      topicCandidates: [selectedTopic, {
        title: "Unselected candidate",
        angle: "Other angle.",
        rationale: "Other evidence.",
        evidenceResultIds: ["result-2"],
      }],
      cautions: [],
      sourceReferences: [{
        resultId: "result-1",
        title: "Selected source",
        sourceUrl: "https://example.com/selected",
      }, {
        resultId: "result-2",
        title: "Unselected source",
        sourceUrl: "https://example.com/unselected",
      }],
      metadata: {
        provider: "mock",
        model: "test-analysis",
        generatedAt: "2026-07-26T00:00:00.000Z",
        inputResultCount: 2,
        schemaVersion: "1",
        isMock: true,
      },
    };
    return (
      <button onClick={() => onUseTopic(selectedTopic, analysis)}>
        使用此选题创作
      </button>
    );
  },
}));

beforeEach(() => {
  window.sessionStorage.clear();
  pushMock.mockClear();
});

describe("Research Library to Creator handoff", () => {
  it("stores only the cropped envelope and navigates to Creator", async () => {
    window.sessionStorage.setItem(CREATOR_TASK_STORAGE_KEY, JSON.stringify({
      topic: "Existing brief",
      audiences: ["Creators"],
      styles: ["Practical"],
      goal: "种草",
      useIntelligence: false,
    }));
    const user = userEvent.setup();
    render(<LibraryPage />);

    await user.click(screen.getByRole("button", { name: "使用此选题创作" }));

    const stored = window.sessionStorage.getItem(CREATOR_TASK_STORAGE_KEY) ?? "";
    expect(JSON.parse(stored)).toMatchObject({
      schemaVersion: "1",
      brief: { topic: "Selected creator workflow" },
      trendContext: {
        topicCandidates: [{ title: "Selected creator workflow" }],
        sourceReferences: [{ resultId: "result-1" }],
      },
    });
    expect(stored).not.toContain("Unselected signal must not be stored");
    expect(stored).not.toContain("Unselected candidate");
    expect(pushMock).toHaveBeenCalledWith("/creator");
  });
});
