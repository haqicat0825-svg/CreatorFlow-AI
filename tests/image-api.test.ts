import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/generate/image/route";
import { createOpenAIImageAdapter } from "@/lib/providers/openai-image";
import { ModelAdapterError } from "@/lib/providers/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function request(body: unknown, ip = crypto.randomUUID()) {
  return new Request("http://localhost/api/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validBody = {
  prompt: "柔和自然光下的生活方式静物封面",
  aspectRatio: "3:4",
  quality: "medium",
  candidateCount: 2,
  provider: "mock",
  model: "CreatorFlow Image Demo",
};

describe("image generation API", () => {
  it("falls back to the explicit mock adapter with the unified shape", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "mock";
    const response = await POST(request(validBody));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ provider: "mock", isMock: true });
    expect(payload.data.images).toHaveLength(2);
  });

  it("rejects non-whitelisted providers, oversized prompts and too many candidates", async () => {
    const provider = await POST(request({ ...validBody, provider: "evil-provider" }));
    expect((await provider.json()).error.code).toBe("INVALID_REQUEST");

    const prompt = await POST(request({ ...validBody, prompt: "x".repeat(4001) }));
    expect(prompt.status).toBe(400);

    const candidates = await POST(request({ ...validBody, candidateCount: 5 }));
    expect(candidates.status).toBe(400);
  });

  it("returns a sanitized missing-configuration error without leaking the API key", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    const response = await POST(request({ ...validBody, provider: "openai", model: "gpt-image-1" }));
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(text).not.toContain("Authorization");
    expect(text).not.toContain("apiKey");
  });
});

describe("OpenAI image error mapping", () => {
  const config = {
    provider: "openai" as const,
    mode: "cloud" as const,
    model: "gpt-image-1",
    size: "1024x1536" as const,
    aspectRatio: "3:4" as const,
    quality: "medium" as const,
    candidateCount: 1,
    configured: true,
    apiKey: "server-secret",
  };
  const input = {
    prompt: "safe prompt",
    aspectRatio: "3:4" as const,
    quality: "medium" as const,
    candidateCount: 1,
  };

  it.each([
    [429, { error: { code: "rate_limit_exceeded" } }, "RATE_LIMITED"],
    [400, { error: { code: "content_policy_violation" } }, "CONTENT_REJECTED"],
    [504, { error: { code: "timeout" } }, "TIMEOUT"],
  ])("maps upstream status %s without exposing the full error", async (status, body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
    await expect(createOpenAIImageAdapter(config).generateImage(input))
      .rejects.toMatchObject<ModelAdapterError>({ code });
  });
});
