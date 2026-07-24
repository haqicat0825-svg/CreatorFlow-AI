import type { ImageAspectRatio, ImageQuality, ServerImageModelConfig } from "@/lib/models/config-types";

export type ImageGenerationRequest = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: ImageAspectRatio;
  quality: ImageQuality;
  candidateCount: number;
  referenceContext?: {
    style?: string[];
    audience?: string[];
    contentGoal?: string;
  };
};

export type GeneratedImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
};

export type ImageGenerationResult = {
  images: GeneratedImage[];
  provider: string;
  model: string;
  isMock: boolean;
  revisedPrompt?: string;
  safetyWarnings: string[];
  generationId: string;
};

export interface ImageGenerationAdapter {
  id: string;
  model: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export type ImageAdapterConfig = ServerImageModelConfig;
