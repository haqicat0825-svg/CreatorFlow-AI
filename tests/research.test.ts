import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileKnowledgeRepository } from "@/lib/knowledge/repository";
import { buildRagContext } from "@/lib/knowledge/rag";
import { classifyCliFailure, executeReadOnlyCli, filterSensitiveFields, parseSafeJsonOutput } from "@/lib/research/cli-runtime";
import { ResearchError } from "@/lib/research/errors";
import { importSelectedResearch } from "@/lib/research/importer";
import { mockResearchAdapter } from "@/lib/research/mock-search";
import { validateSearchRequest, validateSearchResult } from "@/lib/research/normalizer";
import { ResearchRateLimiter } from "@/lib/research/rate-limiter";
import { RESEARCH_CONFIG } from "@/lib/research/types";
import { XIAOHONGSHU_CLI_AUDIT, XiaohongshuCliAdapter } from "@/lib/research/xiaohongshu-cli";

let directory: string;
let repository: FileKnowledgeRepository;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "creatorflow-research-"));
  repository = new FileKnowledgeRepository(path.join(directory, "knowledge.json"));
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

const realResult = {
  id: "note-1",
  title: "真实研究条目",
  summary: "仅保存 CLI 合法返回的摘要。",
  author: "作者",
  sourceUrl: "https://www.xiaohongshu.com/explore/note-1",
  tags: ["穿搭"],
  source: "xiaohongshu" as const,
  retrievedAt: "2026-07-24T10:00:00.000Z",
  isMock: false,
};

describe("research safety", () => {
  it("reports a safe unauthenticated CLI status without exposing identity or credentials", async () => {
    expect(XIAOHONGSHU_CLI_AUDIT.available).toBe(true);
    const execute = async () => ({
      stdout: JSON.stringify({ ok: false, schema_version: "1", error: { code: "not_authenticated", message: "need login" } }),
      exitCode: 1,
    });
    const status = await new XiaohongshuCliAdapter(execute).checkLoginStatus();
    expect(status).toEqual(expect.objectContaining({ available: true, loggedIn: false, provider: "xiaohongshu-cli" }));
    expect(JSON.stringify(status)).not.toMatch(/cookie|token|password|qrcode/i);
  });

  it("validates limits and rejects command-injection characters", () => {
    expect(validateSearchRequest({ query: "韩系穿搭", limit: 10 })).toEqual({
      query: "韩系穿搭",
      limit: 10,
      sortMode: "general",
      contentType: "all",
    });
    expect(() => validateSearchRequest({ query: "test; whoami", limit: 10 })).toThrow(ResearchError);
    expect(() => validateSearchRequest({ query: "test", limit: 11 })).toThrow(/最多返回 10 条/);
    expect(() => validateSearchRequest({ query: "test", limit: 1, sortMode: "likes" })).toThrow(/排序方式无效/);
  });

  it("calls only the audited single-page search command and strips xsec tokens", async () => {
    const calls: string[][] = [];
    const execute = async (_command: string, args: readonly string[]) => {
      calls.push([...args]);
      return {
        stdout: JSON.stringify({
          ok: true,
          schema_version: "1",
          data: {
            items: [{
              id: "note-123",
              xsec_token: "sensitive-token",
              note_card: {
                display_title: "真实标题",
                user: { nickname: "作者" },
                interact_info: { liked_count: "12", collected_count: "not-requested" },
              },
            }],
          },
        }),
        exitCode: 0,
      };
    };
    const results = await new XiaohongshuCliAdapter(execute).searchContent({
      query: "韩系穿搭",
      limit: 10,
      sortMode: "latest",
      contentType: "image",
    });
    expect(calls).toEqual([["search", "韩系穿搭", "--sort", "latest", "--type", "image", "--page", "1", "--json"]]);
    expect(results[0]).toEqual(expect.objectContaining({
      id: "note-123",
      title: "真实标题",
      author: "作者",
      metrics: { likes: 12 },
      isMock: false,
    }));
    expect(JSON.stringify(results)).not.toContain("sensitive-token");
  });

  it("rejects invalid JSON and classifies login and platform blocks without raw output", () => {
    expect(() => parseSafeJsonOutput("not-json")).toThrow(/有效 JSON/);
    expect(classifyCliFailure("captcha token=secret")).toMatchObject({ code: "PLATFORM_BLOCKED" });
    expect(classifyCliFailure("login required cookie=secret")).toMatchObject({ code: "LOGIN_REQUIRED" });
  });

  it("enforces CLI timeout and maximum output length", async () => {
    await expect(executeReadOnlyCli(process.execPath, ["-e", "setTimeout(()=>{},1000)"], { timeoutMs: 20 }))
      .rejects.toMatchObject({ code: "TIMEOUT" });
    await expect(executeReadOnlyCli(process.execPath, ["-e", "process.stdout.write('x'.repeat(2000))"], { maxOutputBytes: 100 }))
      .rejects.toMatchObject({ code: "OUTPUT_TOO_LARGE" });
  });

  it("filters sensitive fields recursively", () => {
    const value = filterSensitiveFields({ title: "ok", cookie: "secret", nested: { accessToken: "secret", id: "safe" } });
    expect(value).toEqual({ title: "ok", nested: { id: "safe" } });
    expect(JSON.stringify(value)).not.toContain("secret");
  });

  it("enforces concurrency and cooldown", async () => {
    const limiter = new ResearchRateLimiter();
    let release!: () => void;
    const pending = limiter.run(() => new Promise<void>(resolve => { release = resolve; }), 100_000);
    await expect(limiter.run(async () => undefined, 100_000)).rejects.toMatchObject({ code: "SEARCH_BUSY" });
    release();
    await pending;
    await expect(limiter.run(async () => undefined, 100_000 + RESEARCH_CONFIG.cooldownMs - 1)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("marks mock results clearly and respects the result limit", async () => {
    const results = await mockResearchAdapter.searchContent({ query: "穿搭", limit: 2 });
    expect(results).toHaveLength(2);
    expect(results.every(item => item.isMock && item.source === "xiaohongshu")).toBe(true);
  });

  it("requires selection, imports selected real results, and skips duplicates", async () => {
    await expect(importSelectedResearch({ query: "穿搭", selected: [] }, repository)).rejects.toThrow(/明确选择/);
    const first = await importSelectedResearch({ query: "穿搭", selected: [realResult] }, repository);
    const second = await importSelectedResearch({ query: "穿搭", selected: [realResult] }, repository);
    expect(first.results[0].status).toBe("imported");
    expect(first.importedIds).toHaveLength(1);
    expect(first.duplicateIds).toEqual([]);
    expect(first.storageConfirmed).toBe(true);
    expect(first.repositoryPath).toBe("knowledge.json");
    expect(first.repositoryPath).not.toContain(directory);
    expect(second.results[0].status).toBe("duplicate");
    expect(second.duplicateIds).toEqual(["note-1"]);
    expect(second.storageConfirmed).toBe(true);
    expect((await repository.list())[0]).toEqual(expect.objectContaining({
      sourceUrl: realResult.sourceUrl,
      qualityStatus: "approved",
      research: expect.objectContaining({ platform: "xiaohongshu", isMock: false }),
    }));
  });

  it("stores mock imports as drafts so they do not enter RAG by default", async () => {
    const [mock] = await mockResearchAdapter.searchContent({ query: "穿搭", limit: 1 });
    await importSelectedResearch({ query: "穿搭", selected: [mock] }, repository);
    const rag = await buildRagContext({
      topic: "穿搭", audiences: ["女生"], styles: ["韩系"], goal: "种草", useIntelligence: true,
    }, repository);
    expect(rag.sources).toHaveLength(0);
  });

  it("lets RAG retrieve a manually imported real entry with its citation", async () => {
    await importSelectedResearch({ query: "穿搭", selected: [realResult] }, repository);
    const rag = await buildRagContext({
      topic: "真实研究条目", audiences: ["作者"], styles: ["穿搭"], goal: "种草", useIntelligence: true,
    }, repository);
    expect(rag.sources[0]).toEqual(expect.objectContaining({
      sourceUrl: realResult.sourceUrl,
      isMock: false,
      matchedReason: expect.any(String),
    }));
  });

  it("rejects malformed normalized results and drops invented metrics", () => {
    expect(() => validateSearchResult({ title: "missing fields" })).toThrow(/必要字段/);
    expect(validateSearchResult({ ...realResult, metrics: { likes: 10, bad: "fake" } }).metrics).toEqual({ likes: 10 });
  });
});
