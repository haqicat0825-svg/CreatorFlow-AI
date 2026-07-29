import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ImageGenerationRequest } from "@/lib/providers/image-types";
import type { ImageGenerationTask, ImageTaskStep } from "./types";

export class ImageTaskRepository {
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly runtimeResults = new Map<string, ImageGenerationTask["result"]>();

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
      requestedProvider: input.provider,
      requestedModel: input.model,
      createdAt: now,
      updatedAt: now,
    };
    await this.mutate(tasks => [...tasks, task]);
    return task;
  }

  async get(id: string) {
    const task = (await this.readAll()).find(item => item.id === id);
    return task ? this.withRuntimeResult(task) : undefined;
  }

  async latest() {
    const task = (await this.readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return task ? this.withRuntimeResult(task) : undefined;
  }

  async update(id: string, patch: Partial<Pick<ImageGenerationTask,
    "status" | "step" | "result" | "libraryItemIds" | "error" | "startedAt" | "completedAt" | "durationMs"
  >>) {
    if (patch.result) this.runtimeResults.set(id, patch.result);
    const persistedPatch = { ...patch };
    delete persistedPatch.result;
    let updated: ImageGenerationTask | undefined;
    await this.mutate(tasks => tasks.map(task => {
      if (task.id !== id) return task;
      updated = { ...task, ...persistedPatch, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (!updated) throw new Error("Image generation task not found.");
    return this.withRuntimeResult(updated);
  }

  async setStep(id: string, step: ImageTaskStep) {
    return this.update(id, { step });
  }

  private withRuntimeResult(task: ImageGenerationTask): ImageGenerationTask {
    const result = this.runtimeResults.get(task.id);
    return result ? { ...task, result } : task;
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
