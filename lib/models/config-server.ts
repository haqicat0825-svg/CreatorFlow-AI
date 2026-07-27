import type {
  ImageAspectRatio,
  ImageProvider,
  ImageQuality,
  ServerImageModelConfig,
  ServerModelConfig,
  TextProvider,
} from "./config-types";

const DEFAULTS = {
  openai: { model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" },
  deepseek: { model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com" },
} as const;

const DEEPSEEK_MODEL_ALLOWLIST = new Set(["deepseek-v4-flash"]);

function normalizeBaseUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      return fallback;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function getServerTextModelConfig(env: NodeJS.ProcessEnv = process.env): ServerModelConfig {
  const requested = (env.CREATORFLOW_TEXT_PROVIDER ?? "").toLowerCase();
  if (requested === "mock") {
    return { provider: "mock", mode: "mock", model: "CreatorFlow Demo", baseUrl: "", hasApiKey: false };
  }
  if (requested === "local-cli") {
    return { provider: "local-cli", mode: "local-cli", model: env.LOCAL_TEXT_MODEL ?? "Local CLI", baseUrl: "", hasApiKey: false };
  }

  const provider: TextProvider =
    requested === "openai" || requested === "deepseek"
      ? requested
      : env.OPENAI_API_KEY
        ? "openai"
        : env.DEEPSEEK_API_KEY
          ? "deepseek"
          : "mock";

  if (provider === "mock") {
    return { provider, mode: "mock", model: "CreatorFlow Demo", baseUrl: "", hasApiKey: false };
  }

  const prefix = provider === "openai" ? "OPENAI" : "DEEPSEEK";
  const apiKey = env[`${prefix}_API_KEY`];
  const defaults = DEFAULTS[provider];
  const requestedModel = env[`${prefix}_MODEL`];
  const model = provider === "deepseek"
    ? requestedModel && DEEPSEEK_MODEL_ALLOWLIST.has(requestedModel)
      ? requestedModel
      : defaults.model
    : requestedModel ?? defaults.model;
  return {
    provider,
    mode: "cloud",
    model,
    baseUrl: normalizeBaseUrl(env[`${prefix}_BASE_URL`], defaults.baseUrl),
    hasApiKey: Boolean(apiKey),
    apiKey,
  };
}

const IMAGE_SIZES = {
  "3:4": "1024x1536",
  "1:1": "1024x1024",
  "4:3": "1536x1024",
} as const;

export function getServerImageModelConfig(env: NodeJS.ProcessEnv = process.env): ServerImageModelConfig {
  const requested = (env.CREATORFLOW_IMAGE_PROVIDER ?? "").toLowerCase();
  const provider: ImageProvider = requested === "openai"
    ? "openai"
    : requested === "volcengine-jimeng"
      ? "volcengine-jimeng"
    : requested === "mock"
      ? "mock"
      : env.OPENAI_API_KEY
        ? "openai"
        : "mock";
  const aspectRatio: ImageAspectRatio = ["3:4", "1:1", "4:3"].includes(env.CREATORFLOW_IMAGE_ASPECT_RATIO ?? "")
    ? env.CREATORFLOW_IMAGE_ASPECT_RATIO as ImageAspectRatio
    : "3:4";
  const quality: ImageQuality = ["low", "medium", "high"].includes(env.OPENAI_IMAGE_QUALITY ?? "")
    ? env.OPENAI_IMAGE_QUALITY as ImageQuality
    : "medium";
  const candidateCount = Math.min(4, Math.max(1, Number.parseInt(env.CREATORFLOW_IMAGE_CANDIDATE_COUNT ?? "4", 10) || 4));

  if (provider === "mock") {
    return {
      provider,
      model: "CreatorFlow Image Demo",
      mode: "mock",
      size: IMAGE_SIZES[aspectRatio],
      aspectRatio,
      quality,
      candidateCount,
      configured: true,
    };
  }

  if (provider === "volcengine-jimeng") {
    const apiKey = env.ARK_API_KEY;
    return {
      provider,
      model: "doubao-seedream-5-0-pro-260628",
      mode: "cloud",
      size: IMAGE_SIZES[aspectRatio],
      aspectRatio,
      quality,
      candidateCount,
      configured: Boolean(apiKey),
      apiKey,
    };
  }

  const apiKey = env.OPENAI_API_KEY;
  return {
    provider,
    model: env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
    mode: "cloud",
    size: IMAGE_SIZES[aspectRatio],
    aspectRatio,
    quality,
    candidateCount,
    configured: Boolean(apiKey),
    apiKey,
  };
}
