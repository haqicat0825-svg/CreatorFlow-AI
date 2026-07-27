export type TextProvider = "openai" | "deepseek" | "mock" | "local-cli";
export type TextMode = "cloud" | "mock" | "local-cli";
export type ImageProvider = "openai" | "volcengine-jimeng" | "mock";
export type ImageMode = "cloud" | "mock";
export type ImageAspectRatio = "3:4" | "1:1" | "4:3";
export type ImageQuality = "low" | "medium" | "high";

export type ServerModelConfig = {
  provider: TextProvider;
  mode: TextMode;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  apiKey?: string;
};

export type ClientModelStatus = {
  configured: boolean;
  missing: boolean;
  model: string;
  provider: TextProvider;
  mode: TextMode;
};

export type ServerImageModelConfig = {
  provider: ImageProvider;
  model: string;
  mode: ImageMode;
  size: "1024x1536" | "1024x1024" | "1536x1024";
  aspectRatio: ImageAspectRatio;
  quality: ImageQuality;
  candidateCount: number;
  configured: boolean;
  apiKey?: string;
};

export type ClientImageModelStatus = Omit<ServerImageModelConfig, "apiKey">;

export function toClientModelStatus(config: ServerModelConfig): ClientModelStatus {
  const configured = config.mode === "mock" || (config.mode === "cloud" && config.hasApiKey);
  return {
    configured,
    missing: !configured,
    model: config.model,
    provider: config.provider,
    mode: config.mode,
  };
}
