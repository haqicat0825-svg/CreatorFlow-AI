import type { ImageGenerationResult } from "@/lib/providers/image-types";

export type ImageTaskStatus = "processing" | "completed" | "failed";

export type ImageTaskStep =
  | "analyzing"
  | "building_prompt"
  | "calling_model"
  | "generating_image"
  | "saving_library"
  | "completed";

export type ImageGenerationTask = {
  id: string;
  status: ImageTaskStatus;
  step: ImageTaskStep;
  requestedProvider?: string;
  requestedModel?: string;
  result?: ImageGenerationResult;
  libraryItemIds?: string[];
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
};
