import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import { POST } from "@/app/api/generate/image/route";
import { createOpenAIImageAdapter } from "@/lib/providers/openai-image";
import { createVolcengineJimengImageAdapter } from "@/lib/providers/volcengine-jimeng-image";
import { ModelAdapterError } from "@/lib/providers/types";
import { waitForImageTasks } from "@/lib/image-tasks/processor";

const originalEnv = { ...process.env };
const testDataDirectory = path.join(process.cwd(), ".tmp", `image-api-tests-${process.pid}`);

beforeEach(() => {
  process.env.CREATORFLOW_DATA_DIR = testDataDirectory;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

afterAll(async () => {
  await waitForImageTasks();
  await rm(testDataDirectory, { recursive: true, force: true });
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
  it("creates a persisted image generation task without waiting for the provider", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "mock";
    const response = await POST(request(validBody));
    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload).toMatchObject({ status: "processing" });
    expect(payload.taskId).toEqual(expect.any(String));
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
    expect(response.status).toBe(202);
    expect(text).not.toContain("Authorization");
    expect(text).not.toContain("apiKey");
  });

  it("uses the Ark image provider when explicitly configured", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "volcengine-jimeng";
    process.env.ARK_API_KEY = "server-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ url: "https://example.com/generated.png" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({
      ...validBody,
      provider: "volcengine-jimeng",
      model: "doubao-seedream-5-0-pro-260628",
    }));
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({ status: "processing", taskId: expect.any(String) });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Authorization": "Bearer server-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "doubao-seedream-5-0-pro-260628",
          prompt: validBody.prompt,
          response_format: "url",
          size: "2K",
          watermark: false,
        }),
      }),
    ));
  });

  it("requires ARK_API_KEY without exposing configuration details", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "volcengine-jimeng";
    delete process.env.ARK_API_KEY;
    const response = await POST(request({
      ...validBody,
      provider: "volcengine-jimeng",
      model: "doubao-seedream-5-0-pro-260628",
    }));
    const text = await response.text();
    expect(response.status).toBe(202);
    expect(text).not.toContain("Authorization");
    expect(text).not.toContain("apiKey");
  });

  it("keeps mock fallback when Ark is not selected", async () => {
    process.env.CREATORFLOW_IMAGE_PROVIDER = "mock";
    process.env.ARK_API_KEY = "server-secret";
    const response = await POST(request(validBody));
    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload).toMatchObject({ status: "processing", taskId: expect.any(String) });
  });
});

describe("Ark image error mapping", () => {
  const config = {
    provider: "volcengine-jimeng" as const,
    mode: "cloud" as const,
    model: "doubao-seedream-5-0-pro-260628",
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
    [401, "UNAUTHORIZED"],
    [429, "RATE_LIMITED"],
    [504, "TIMEOUT"],
    [500, "UPSTREAM_ERROR"],
  ])("maps upstream status %s safely", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("upstream details", { status })));
    await expect(createVolcengineJimengImageAdapter(config).generateImage(input))
      .rejects.toMatchObject({ code });
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
