import type { ServerModelConfig } from "@/lib/models/config-types";
import { mockTextAdapter } from "./mock";
import { createOpenAICompatibleTextAdapter } from "./openai-compatible-text";
import { ModelAdapterError, type TextModelAdapter } from "./types";

const localCliDisabledAdapter: TextModelAdapter = {
  id: "local-cli-disabled",
  model: "Local CLI",
  async testConnection() {
    throw new ModelAdapterError("LOCAL_CLI_DISABLED", "Local CLI 当前未启用。", 503);
  },
  async generate() {
    throw new ModelAdapterError("LOCAL_CLI_DISABLED", "Local CLI 在 Phase 3A 尚未启用。", 503);
  },
};

export function createTextAdapter(config: ServerModelConfig): TextModelAdapter {
  if (config.mode === "mock" || config.provider === "mock") return mockTextAdapter;
  if (config.mode === "local-cli" || config.provider === "local-cli") return localCliDisabledAdapter;
  if (config.mode === "cloud" && (config.provider === "openai" || config.provider === "deepseek")) {
    return createOpenAICompatibleTextAdapter(config);
  }
  throw new ModelAdapterError("CONFIGURATION_MISSING", "不支持的文本模型配置。", 503);
}
