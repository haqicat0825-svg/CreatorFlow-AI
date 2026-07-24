import { describe, expect, it } from "vitest";
import { createTextAdapter } from "@/lib/providers/factory";
import { ModelAdapterError } from "@/lib/providers/types";

describe("text adapter factory", () => {
  it("creates mock and OpenAI-compatible adapters", () => {
    expect(createTextAdapter({ provider: "mock", mode: "mock", model: "demo", baseUrl: "", hasApiKey: false }).id).toBe("mock-deepseek");
    expect(createTextAdapter({ provider: "deepseek", mode: "cloud", model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", hasApiKey: true, apiKey: "secret" }).id).toBe("deepseek-compatible");
  });

  it("returns a clear disabled state for Local CLI", async () => {
    const adapter = createTextAdapter({ provider: "local-cli", mode: "local-cli", model: "local", baseUrl: "", hasApiKey: false });
    await expect(adapter.generate({ topic: "测试", audiences: ["创作者"], styles: ["简洁"], goal: "涨粉", useIntelligence: false }))
      .rejects.toMatchObject<ModelAdapterError>({ code: "LOCAL_CLI_DISABLED" });
  });
});
