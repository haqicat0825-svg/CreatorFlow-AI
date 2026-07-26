import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileKnowledgeRepository } from "@/lib/knowledge/repository";
import { GET as listKnowledge, POST as createKnowledge } from "@/app/api/knowledge/route";
import { GET as listItems } from "@/app/api/knowledge/items/route";
import { POST as searchKnowledge } from "@/app/api/knowledge/search/route";

let directory: string;
let repository: FileKnowledgeRepository;

vi.mock("@/lib/knowledge/repository", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/knowledge/repository")>();
  return {
    ...actual,
    getKnowledgeRepository: () => repository,
  };
});

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "creatorflow-knowledge-api-"));
  repository = new FileKnowledgeRepository(path.join(directory, "knowledge.json"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("Knowledge API routes", () => {
  it("round-trips UTF-8 JSON and returns a controlled duplicate response", async () => {
    const input = {
      title: "韩系秋季针织穿搭参考🎀",
      content: "奶油白针织衫＋深色半裙，下午自然光，适合咖啡店场景。",
      tags: ["韩系穿搭", "秋季", "针织衫"],
      sourceType: "manual",
      contentType: "reference",
      qualityStatus: "approved",
      authenticityStatus: "verified",
    };
    const request = () => new Request("http://localhost/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(input),
    });

    const first = await createKnowledge(request());
    const firstBytes = new Uint8Array(await first.clone().arrayBuffer());
    const firstPayload = await first.json();
    expect(first.status).toBe(201);
    expect(first.headers.get("content-type")).toContain("application/json");
    expect(new TextDecoder("utf-8", { fatal: true }).decode(firstBytes)).toContain("韩系秋季针织穿搭参考🎀");
    expect(firstPayload.data).toMatchObject(input);

    const refreshed = await listKnowledge(new Request("http://localhost/api/knowledge"));
    expect((await refreshed.json()).data).toEqual([firstPayload.data]);

    const second = await createKnowledge(request());
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({
      success: false,
      error: {
        code: "DUPLICATE",
        message: "相同知识条目已存在。",
        existingId: firstPayload.data.id,
      },
    });
    expect(await repository.list()).toEqual([firstPayload.data]);
  });

  it("lists repository items without being captured by the dynamic ID route", async () => {
    const response = await listItems();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: expect.any(Array) });
  });

  it("searches through the existing repository", async () => {
    const response = await searchKnowledge(new Request("http://localhost/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "route-validation", limit: 5 }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: expect.any(Array) });
  });

  it("rejects invalid search input locally", async () => {
    const response = await searchKnowledge(new Request("http://localhost/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "", limit: 50 }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "INVALID_REQUEST" } });
  });
});
