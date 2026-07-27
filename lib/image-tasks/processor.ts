import { getKnowledgeRepository, KnowledgeRepositoryError } from "@/lib/knowledge/repository";
import type { ServerImageModelConfig } from "@/lib/models/config-types";
import { createImageAdapter } from "@/lib/providers/image-factory";
import { ModelAdapterError } from "@/lib/providers/types";
import { getImageTaskRepository } from "./repository";

const running = new Map<string, Promise<void>>();

export function startImageTask(taskId: string, serverConfig: ServerImageModelConfig) {
  if (running.has(taskId)) return;
  setTimeout(() => {
    const work = processImageTask(taskId, serverConfig).finally(() => running.delete(taskId));
    running.set(taskId, work);
  }, 0);
}

export async function waitForImageTasks() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.all([...running.values()]);
}

async function processImageTask(taskId: string, serverConfig: ServerImageModelConfig) {
  const tasks = getImageTaskRepository();
  try {
    const task = await tasks.get(taskId);
    if (!task || task.status !== "processing") return;

    const visualMemory = await getKnowledgeRepository().search(task.prompt, {
      tags: task.request.referenceContext?.style,
      categories: ["style_preference", "ai_image"],
      limit: 6,
    });
    await tasks.setStep(taskId, "building_prompt");
    const memoryStyles = visualMemory.flatMap(result => [
      ...result.item.tags,
      ...(result.item.prompt ? [result.item.prompt.slice(0, 240)] : []),
    ]).slice(0, 12);
    const requestWithMemory = {
      ...task.request,
      referenceContext: {
        ...task.request.referenceContext,
        style: [...new Set([...(task.request.referenceContext?.style ?? []), ...memoryStyles])].slice(0, 16),
      },
    };

    await tasks.setStep(taskId, "calling_model");
    const generation = createImageAdapter({
      ...serverConfig,
      aspectRatio: task.request.aspectRatio,
      size: sizeFor(task.request.aspectRatio),
      quality: task.request.quality,
      candidateCount: task.request.candidateCount,
    }).generateImage(requestWithMemory);
    await tasks.setStep(taskId, "generating_image");
    const result = await generation;

    await tasks.setStep(taskId, "saving_library");
    const libraryItemIds: string[] = [];
    for (const [index, image] of result.images.entries()) {
      try {
        const item = await getKnowledgeRepository().create({
          category: "ai_image",
          title: `AI 图片 · ${task.prompt.slice(0, 52)} · ${index + 1}`,
          content: `${task.prompt}\n\nImage: ${image.url}`,
          sourceType: "other",
          tags: [...new Set([...(task.request.referenceContext?.style ?? []), "AI图片"])],
          contentType: "reference",
          qualityStatus: "approved",
          authenticityStatus: result.isMock ? "unverified" : "verified",
          imageUrl: image.url,
          coverImage: image.url,
          images: [image.url],
          prompt: task.prompt,
          model: result.model,
          provider: result.provider,
        });
        libraryItemIds.push(item.id);
      } catch (error) {
        if (error instanceof KnowledgeRepositoryError && error.code === "DUPLICATE" && error.existingId) {
          libraryItemIds.push(error.existingId);
          continue;
        }
        throw error;
      }
    }

    const completedAt = new Date().toISOString();
    await tasks.update(taskId, {
      status: "completed",
      step: "completed",
      result,
      libraryItemIds,
      completedAt,
    });
  } catch (error) {
    const mapped = mapTaskError(error);
    await tasks.update(taskId, {
      status: "failed",
      error: mapped,
      completedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

function mapTaskError(error: unknown) {
  if (error instanceof ModelAdapterError) return { code: error.code, message: safeMessage(error.code) };
  return { code: "INTERNAL_ERROR", message: "图片生成失败，请稍后重试。" };
}

function safeMessage(code: string) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "图片模型鉴权失败，请检查服务端配置。",
    RATE_LIMITED: "图片模型请求过于频繁，请稍后重试。",
    TIMEOUT: "图片模型处理超时，请稍后重试。",
    CONTENT_REJECTED: "图片请求未通过安全检查，请修改 Prompt。",
    CONFIGURATION_MISSING: "图片模型尚未完成服务端配置。",
  };
  return messages[code] ?? "图片模型暂时不可用，请稍后重试。";
}

function sizeFor(ratio: "3:4" | "1:1" | "4:3"): ServerImageModelConfig["size"] {
  if (ratio === "1:1") return "1024x1024";
  if (ratio === "4:3") return "1536x1024";
  return "1024x1536";
}
