import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ImageGenerationRequest } from "@/lib/providers/image-types";
import type { ImageGenerationTask, ImageTaskStep } from "./types";

export class ImageTaskRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath = getTaskFilePath()) {}

  async create(input: {
    request: ImageGenerationRequest;
    provider?: string;
    model?: string;
  }) {
    const now = new Date().toISOString();
    const task: ImageGenerationTask = {
      id: randomUUID(),
      status: "processing",
      step: "analyzing",
      prompt: input.request.prompt,
      request: input.request,
      requestedProvider: input.provider,
      requestedModel: input.model,
      createdAt: now,
      updatedAt: now,
    };
    await this.mutate(tasks => [...tasks, task]);
    return task;
  }

  async get(id: string) {
    return (await this.readAll()).find(task => task.id === id);
  }

  async latest() {
    return (await this.readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  async update(id: string, patch: Partial<Pick<ImageGenerationTask,
    "status" | "step" | "result" | "libraryItemIds" | "error" | "completedAt"
  >>) {
    let updated: ImageGenerationTask | undefined;
    await this.mutate(tasks => tasks.map(task => {
      if (task.id !== id) return task;
      updated = { ...task, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (!updated) throw new Error("Image generation task not found.");
    return updated;
  }

  async setStep(id: string, step: ImageTaskStep) {
    return this.update(id, { step });
  }

  private async readAll(): Promise<ImageGenerationTask[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async mutate(work: (tasks: ImageGenerationTask[]) => ImageGenerationTask[]) {
    const previous = this.writeQueue;
    let release!: () => void;
    this.writeQueue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    let temporary: string | undefined;
    try {
      const tasks = work(await this.readAll());
      const directory = path.dirname(this.filePath);
      await mkdir(directory, { recursive: true });
      temporary = path.join(directory, `.image-tasks.${process.pid}.${Date.now()}.tmp`);
      await writeFile(temporary, JSON.stringify(tasks, null, 2), { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(temporary, this.filePath);
      temporary = undefined;
    } finally {
      if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
      release();
    }
  }
}

let repository: ImageTaskRepository | undefined;

export function getImageTaskRepository() {
  repository ??= new ImageTaskRepository();
  return repository;
}

function getTaskFilePath() {
  const projectRoot = path.resolve(process.cwd());
  const configured = process.env.CREATORFLOW_DATA_DIR?.trim();
  const directory = configured
    ? path.isAbsolute(configured) ? path.resolve(configured) : path.resolve(projectRoot, configured)
    : path.join(projectRoot, ".creatorflow-data");
  const relative = path.relative(projectRoot, directory);
  if (!path.isAbsolute(directory) || (!path.isAbsolute(configured ?? "") && (relative === ".." || relative.startsWith(`..${path.sep}`)))) {
    throw new Error("Image task data directory is invalid.");
  }
  return path.join(directory, "image-generation-tasks.json");
}

