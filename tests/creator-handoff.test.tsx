import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatorPage from "@/app/creator/page";
import { validTrendContext } from "./fixtures/trend-context";

const brief = {
  topic: "Layering formulas",
  audiences: ["Commuters"],
  styles: ["Practical"],
  goal: "种草" as const,
  useIntelligence: false,
};

const successPayload = {
  success: true,
  data: {
    titles: Array.from({ length: 5 }, (_, index) => ({
      id: `title-${index}`,
      title: `Generated title ${index + 1}`,
      match: 95 - index,
    })),
    body: "Generated body",
    tags: ["#generated"],
    coverPrompt: "Editorial cover",
    safetyReport: { score: 100, checks: [] },
    metadata: { provider: "mock", model: "test" },
    isMock: true,
  },
};

function installSuccessfulFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(successPayload), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse(String(fetchMock.mock.calls[call][1]?.body));
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("Creator task handoff", () => {
  it("generates from a legacy ContentTask using the compatible request", async () => {
    window.sessionStorage.setItem("creatorflow-task", JSON.stringify(brief));
    const fetchMock = installSuccessfulFetch();

    render(<CreatorPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock)).toEqual({ brief });
  });

  it("generates from a CreatorTaskEnvelope and sends TrendContext", async () => {
    window.sessionStorage.setItem("creatorflow-task", JSON.stringify({
      schemaVersion: "1",
      brief,
      trendContext: validTrendContext,
    }));
    const fetchMock = installSuccessfulFetch();

    render(<CreatorPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock)).toEqual({
      brief,
      trendContext: validTrendContext,
    });
  });

  it("keeps TrendContext after a page refresh", async () => {
    window.sessionStorage.setItem("creatorflow-task", JSON.stringify({
      schemaVersion: "1",
      brief,
      trendContext: validTrendContext,
    }));
    const fetchMock = installSuccessfulFetch();

    const firstRender = render(<CreatorPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    firstRender.unmount();
    render(<CreatorPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestBody(fetchMock, 1).trendContext).toEqual(validTrendContext);
  });

  it("keeps TrendContext when regenerating", async () => {
    window.sessionStorage.setItem("creatorflow-task", JSON.stringify({
      schemaVersion: "1",
      brief,
      trendContext: validTrendContext,
    }));
    const fetchMock = installSuccessfulFetch();
    const user = userEvent.setup();

    render(<CreatorPage />);
    await screen.findByDisplayValue("Generated title 1");
    await user.click(screen.getByRole("button", { name: /重新生成/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestBody(fetchMock, 1).trendContext).toEqual(validTrendContext);
  });

  it("does not generate from invalid sessionStorage", async () => {
    window.sessionStorage.setItem(
      "creatorflow-task",
      JSON.stringify({ schemaVersion: "1", brief: { topic: "incomplete" } }),
    );
    const fetchMock = installSuccessfulFetch();

    render(<CreatorPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
