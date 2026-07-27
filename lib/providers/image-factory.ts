import { ModelAdapterError } from "./types";
import type { ImageAdapterConfig, ImageGenerationAdapter } from "./image-types";
import { createMockImageAdapter } from "./mock-image";
import { createOpenAIImageAdapter } from "./openai-image";
import { createVolcengineJimengImageAdapter } from "./volcengine-jimeng-image";

export function createImageAdapter(config: ImageAdapterConfig): ImageGenerationAdapter {
  if (config.mode === "mock" && config.provider === "mock") return createMockImageAdapter(config);
  if (config.mode === "cloud" && config.provider === "openai") {
    if (!config.configured || !config.apiKey) {
      throw new ModelAdapterError("CONFIGURATION_MISSING", "图片模型服务端配置不完整。", 503);
    }
    return createOpenAIImageAdapter(config);
  }
  if (config.mode === "cloud" && config.provider === "volcengine-jimeng") {
    if (!config.configured || !config.apiKey) {
      throw new ModelAdapterError("CONFIGURATION_MISSING", "图片模型服务端配置不完整。", 503);
    }
    return createVolcengineJimengImageAdapter(config);
  }
  throw new ModelAdapterError("CONFIGURATION_MISSING", "不支持的图片 Provider。", 503);
}
