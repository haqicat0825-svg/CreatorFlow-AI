import { ModelAdapterError } from "./types";
import type { ImageAdapterConfig, ImageGenerationAdapter, ImageGenerationRequest } from "./image-types";

const TIMEOUT_MS = 90_000;

export function createOpenAIImageAdapter(config: ImageAdapterConfig): ImageGenerationAdapter {
  return {
    id: "openai-image",
    model: config.model,
    async generateImage(request: ImageGenerationRequest) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            prompt: buildPrompt(request),
            n: request.candidateCount,
            size: sizeFor(request.aspectRatio),
            quality: request.quality,
            output_format: "png",
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw await mapOpenAIError(response);
        const payload = await response.json() as {
          data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
        };
        if (!Array.isArray(payload.data) || payload.data.length === 0) {
          throw new ModelAdapterError("INVALID_RESPONSE", "图片服务返回了无效结果。", 502);
        }
        const dimensions = dimensionsFor(request.aspectRatio);
        const generationId = crypto.randomUUID();
        const images = payload.data.map((image, index) => ({
          id: `${generationId}-${index + 1}`,
          url: image.url ?? (image.b64_json ? `data:image/png;base64,${image.b64_json}` : ""),
          width: dimensions.width,
          height: dimensions.height,
          mimeType: "image/png",
        }));
        if (images.some(image => !image.url)) {
          throw new ModelAdapterError("INVALID_RESPONSE", "图片服务未返回可用资源。", 502);
        }
        return {
          images,
          provider: "openai",
          model: config.model,
          isMock: false,
          revisedPrompt: payload.data.find(image => image.revised_prompt)?.revised_prompt,
          safetyWarnings: [],
          generationId,
        };
      } catch (error) {
        if (error instanceof ModelAdapterError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new ModelAdapterError("TIMEOUT", "图片生成超时。", 504);
        }
        throw new ModelAdapterError("UPSTREAM_ERROR", "图片服务暂时不可用。", 502);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function buildPrompt(request: ImageGenerationRequest) {
  const context = request.referenceContext
    ? `\n创作上下文：风格 ${request.referenceContext.style?.join("、") || "未指定"}；受众 ${request.referenceContext.audience?.join("、") || "未指定"}；目标 ${request.referenceContext.contentGoal || "未指定"}。`
    : "";
  const negative = request.negativePrompt ? `\n避免：${request.negativePrompt}` : "";
  return `${request.prompt}${context}${negative}

视觉安全与真实性规则：
- 不复制具体创作者的脸、身份特征或在世创作者的独特形象。
- 不使用未经授权的品牌 Logo，不伪造产品功效或真实用户反馈。
- 不生成平台水印、虚假点赞量或虚假账号信息。
- 默认不生成封面文字，文字由后续前端排版。
- 保留小红书竖版构图与安全留白，明确主体、场景、光线、色调、镜头和构图。
- 可参考高表现内容的视觉规律，但不得复制原图。`;
}

function sizeFor(ratio: ImageGenerationRequest["aspectRatio"]) {
  if (ratio === "1:1") return "1024x1024";
  if (ratio === "4:3") return "1536x1024";
  return "1024x1536";
}

function dimensionsFor(ratio: ImageGenerationRequest["aspectRatio"]) {
  const [width, height] = sizeFor(ratio).split("x").map(Number);
  return { width, height };
}

async function mapOpenAIError(response: Response) {
  let code = "";
  try {
    const payload = await response.json() as { error?: { code?: string; type?: string } };
    code = `${payload.error?.code ?? ""} ${payload.error?.type ?? ""}`.toLowerCase();
  } catch {
    // The upstream body is deliberately not exposed.
  }
  if (response.status === 401 || response.status === 403) return new ModelAdapterError("UNAUTHORIZED", "图片服务鉴权失败。", 502);
  if (response.status === 429) return new ModelAdapterError("RATE_LIMITED", "图片服务请求过于频繁。", 429);
  if (code.includes("safety") || code.includes("content_policy") || code.includes("moderation")) {
    return new ModelAdapterError("CONTENT_REJECTED", "图片请求未通过内容安全检查。", 422);
  }
  if (response.status === 408 || response.status === 504) return new ModelAdapterError("TIMEOUT", "图片生成超时。", 504);
  return new ModelAdapterError("UPSTREAM_ERROR", "图片服务暂时不可用。", 502);
}
