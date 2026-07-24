import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileKnowledgeRepository, KnowledgeRepositoryError } from "@/lib/knowledge/repository";

let directory: string;
let repository: FileKnowledgeRepository;

const input = {
  title: "秋季韩系穿搭结构",
  content: "先描述具体场景，再给出三条可执行搭配建议，避免绝对化营销语言。",
  sourceType: "manual" as const,
  tags: ["韩系", "秋季穿搭"],
  contentType: "case-study" as const,
  qualityStatus: "approved" as const,
  authenticityStatus: "verified" as const,
};

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "creatorflow-knowledge-"));
  repository = new FileKnowledgeRepository(path.join(directory, "knowledge.json"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("FileKnowledgeRepository", () => {
  it("creates, lists and retrieves a knowledge item", async () => {
    const created = await repository.create(input);
    expect(await repository.list()).toEqual([created]);
    expect(await repository.getById(created.id)).toEqual(created);
    expect(JSON.stringify(created)).not.toMatch(/apiKey|cookie|credential/i);
    expect(JSON.parse(await readFile(path.join(directory, "knowledge.json"), "utf8"))).toEqual([created]);
    expect((await readdir(directory)).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });

  it("rejects normalized duplicates", async () => {
    await repository.create(input);
    await expect(repository.create({ ...input, title: " 秋季 韩系穿搭结构 ", content: "先描述具体场景，再给出三条可执行搭配建议，避免绝对化营销语言。" }))
      .rejects.toMatchObject<KnowledgeRepositoryError>({ code: "DUPLICATE" });
  });

  it("ranks approved keyword and tag matches and excludes drafts", async () => {
    await repository.create(input);
    await repository.create({ ...input, title: "未审核参考", content: "秋季穿搭", qualityStatus: "draft", tags: ["秋季穿搭"] });
    const results = await repository.search("秋季韩系", { tags: ["秋季穿搭"] });
    expect(results).toHaveLength(1);
    expect(results[0].item.title).toBe(input.title);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("uses the server data directory override and rejects relative traversal", async () => {
    const previous = process.env.CREATORFLOW_DATA_DIR;
    process.env.CREATORFLOW_DATA_DIR = directory;
    try {
      const configuredRepository = new FileKnowledgeRepository();
      await configuredRepository.create(input);
      expect(JSON.parse(await readFile(path.join(directory, "knowledge.json"), "utf8"))).toHaveLength(1);
    } finally {
      if (previous === undefined) delete process.env.CREATORFLOW_DATA_DIR;
      else process.env.CREATORFLOW_DATA_DIR = previous;
    }

    process.env.CREATORFLOW_DATA_DIR = "../outside-project";
    try {
      expect(() => new FileKnowledgeRepository()).toThrow(/cannot escape/);
    } finally {
      if (previous === undefined) delete process.env.CREATORFLOW_DATA_DIR;
      else process.env.CREATORFLOW_DATA_DIR = previous;
    }
  });
});
