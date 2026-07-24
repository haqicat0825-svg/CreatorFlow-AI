import { describe, expect, it, vi } from "vitest";
import { getServerTextModelConfig } from "@/lib/models/config-server";
import { createOpenAICompatibleTextAdapter } from "@/lib/providers/openai-compatible-text";
import { parseModelContent } from "@/lib/content/validation";
import { ModelAdapterError } from "@/lib/providers/types";

const config = {
  provider: "deepseek" as const,
  mode: "cloud" as const,
  model: "deepseek-v4-flash",
  baseUrl: "https://api.deepseek.com",
  hasApiKey: true,
  apiKey: "server-only",
};

const validPayload = {
  titles: Array.from({ length: 5 }, (_, index) => ({
    id: `title-${index}`,
    title: `结构化标题 ${index}`,
    match: 95 - index,
  })),
  body: "根据 Content Brief 重新组织的正文。",
  tags: ["#结构化输出"],
  coverPrompt: "结构化封面提示词",
  safetyReport: {
    score: 100,
    checks: [],
    copyingRisk: {
      status: "passed",
      titleExactMatch: false,
      titleHighSimilarity: false,
      bodyLongOverlap: false,
      regenerated: false,
    },
  },
};

describe("DeepSeek server configuration", () => {
  it("uses the allowlisted DeepSeek model and base URL", () => {
    expect(getServerTextModelConfig({
      CREATORFLOW_TEXT_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "configured",
    })).toMatchObject({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      baseUrl: "https://api.deepseek.com",
      mode: "cloud",
    });
    expect(getServerTextModelConfig({
      CREATORFLOW_TEXT_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "configured",
      DEEPSEEK_MODEL: "unlisted-model",
    }).model).toBe("deepseek-v4-flash");
  });

  it("separates a successful upstream connection from the content contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        finish_reason: "stop",
        message: {
          reasoning_content: "must-not-be-returned",
          content: "{\"ok\":true}",
        },
      }],
    }), { status: 200, headers: { "x-request-id": "safe-request-1" } }));
    const connection = await createOpenAICompatibleTextAdapter(config, { fetch: fetcher }).testConnection();
    const request = JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.max_tokens).toBe(64);
    expect(connection).toMatchObject({
      upstreamConnected: true,
      contentContractValid: null,
      diagnostics: {
        httpStatus: 200,
        choicesCount: 1,
        contentPresent: true,
        contentEmpty: false,
        finishReason: "stop",
        requestId: "safe-request-1",
      },
    });
    expect(JSON.stringify(connection)).not.toContain("must-not-be-returned");
  });

  it("reports upstream success and a safe path when the schema fails", () => {
    try {
      parseModelContent({
        content: "{\"titles\":[]}",
        diagnostics: {
          upstreamConnected: true,
          httpStatus: 200,
          choicesCount: 1,
          contentPresent: true,
          contentLength: 13,
          contentEmpty: false,
          hasMarkdownFence: false,
          finishReason: "stop",
        },
      });
      throw new Error("expected schema failure");
    } catch (error) {
      expect(error).toMatchObject<ModelAdapterError>({
        code: "SCHEMA_MISMATCH",
        diagnostics: expect.objectContaining({
          upstreamConnected: true,
          contentContractValid: false,
          schemaErrorPath: "titles",
        }),
      });
    }
  });

  it("parses a complete DeepSeek JSON result and ignores reasoning content", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        finish_reason: "stop",
        message: {
          reasoning_content: "must-not-be-returned",
          content: JSON.stringify(validPayload),
        },
      }],
    }), { status: 200 }));
    const raw = await createOpenAICompatibleTextAdapter(config, { fetch: fetcher }).generate({
      topic: "测试",
      audiences: ["创作者"],
      styles: ["简洁"],
      goal: "种草",
      useIntelligence: false,
    });
    const parsed = parseModelContent(raw);
    const request = JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.max_tokens).toBe(2_400);
    expect(parsed).toMatchObject({ body: validPayload.body, tags: validPayload.tags });
    expect(JSON.stringify(raw)).not.toContain("must-not-be-returned");
  });
});
