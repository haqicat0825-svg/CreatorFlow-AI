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

const unicodeInput = {
  title: "韩系秋季针织穿搭参考🎀",
  content: "奶油白针织衫＋深色半裙，下午自然光，适合咖啡店场景。",
  sourceType: "manual" as const,
  tags: ["韩系穿搭", "秋季", "针织衫"],
  contentType: "reference" as const,
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

  it("round-trips Chinese punctuation and emoji through UTF-8 storage", async () => {
    const created = await repository.create(unicodeInput);
    const raw = await readFile(path.join(directory, "knowledge.json"), "utf8");
    const reopened = new FileKnowledgeRepository(path.join(directory, "knowledge.json"));

    expect(created).toMatchObject(unicodeInput);
    expect(JSON.parse(raw)).toEqual([created]);
    expect(await reopened.list()).toEqual([created]);
  });

  it("rejects normalized duplicates", async () => {
    const created = await repository.create(unicodeInput);
    await expect(repository.create({
      ...unicodeInput,
      title: "  韩系秋季针织穿搭参考🎀  ",
      content: "奶油白针织衫＋深色半裙，\r\n下午自然光，  适合咖啡店场景。",
    })).rejects.toMatchObject<KnowledgeRepositoryError>({
      code: "DUPLICATE",
      existingId: created.id,
    });
    expect(await repository.list()).toEqual([created]);
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
