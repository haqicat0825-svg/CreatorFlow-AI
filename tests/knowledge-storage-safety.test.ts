import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { FileKnowledgeRepository, KnowledgeRepositoryError } from "@/lib/knowledge/repository";

let directory: string;
let filePath: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "creatorflow-knowledge-safety-"));
  filePath = path.join(directory, "knowledge.json");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("Knowledge repository storage safety", () => {
  it("preserves the original JSON when atomic replacement fails", async () => {
    const repository = new FileKnowledgeRepository(filePath);
    await repository.create({
      title: "原始中文条目",
      content: "这份内容必须在写入失败后保持不变。",
      sourceType: "manual",
      tags: ["安全"],
      contentType: "reference",
      qualityStatus: "approved",
      authenticityStatus: "verified",
    });
    const original = await readFile(filePath, "utf8");

    const failingRepository = new FileKnowledgeRepository(
      filePath,
      async () => { throw new Error("simulated atomic replace failure"); },
    );
    await expect(failingRepository.create({
      title: "不会写入的新条目",
      content: "模拟原子替换失败。",
      sourceType: "manual",
      tags: ["失败测试"],
      contentType: "reference",
      qualityStatus: "approved",
      authenticityStatus: "verified",
    })).rejects.toMatchObject<KnowledgeRepositoryError>({ code: "STORAGE_ERROR" });

    expect(await readFile(filePath, "utf8")).toBe(original);
  });
});
