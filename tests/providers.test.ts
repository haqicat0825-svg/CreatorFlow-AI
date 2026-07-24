import { describe, expect, it } from "vitest";
import { mockImageAdapter, mockTextAdapter } from "@/lib/providers";
import type { ContentTask } from "@/lib/types";

const task: ContentTask = {
  topic: "秋季韩系穿搭",
  audiences: ["18-25岁女生"],
  styles: ["韩系甜美"],
  goal: "种草",
  useIntelligence: true,
};

describe("mock model adapters", () => {
  it("returns five ranked title candidates", async () => {
    const result = await mockTextAdapter.generate(task);
    expect(result.titles).toHaveLength(5);
    expect(result.titles[0].match).toBeGreaterThanOrEqual(90);
  });

  it("returns a cover prompt and a 92-point safety report", async () => {
    const visual = await mockImageAdapter.generatePrompt(task);
    const content = await mockTextAdapter.generate(task);
    expect(visual.prompt).toContain("秋季韩系穿搭");
    expect(content.safety.score).toBe(92);
    expect(content.safety.checks).toHaveLength(4);
  });
});
