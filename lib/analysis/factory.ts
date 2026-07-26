import { getServerTextModelConfig } from "@/lib/models/config-server";
import { ModelAdapterError } from "@/lib/providers/types";
import { buildTrendAnalysisPrompt, TREND_ANALYSIS_SYSTEM_PROMPT } from "./prompt";
import { mockTrendAnalysisAdapter } from "./mock";
import type { TrendAnalysisAdapter } from "./types";
import { validateResearchResults, validateTrendAnalysisCore } from "./validation";

type FactoryOptions = {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
};

export function createTrendAnalysisAdapter(options: FactoryOptions = {}): TrendAnalysisAdapter {
  const config = getServerTextModelConfig(options.env);
  if (config.provider !== "deepseek" || config.mode !== "cloud") return mockTrendAnalysisAdapter;

  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 30_000;

  return {
    id: "deepseek-analysis",
    async analyze(input) {
      const results = validateResearchResults(input);
      if (!config.apiKey) {
        throw new ModelAdapterError("CONFIGURATION_MISSING", "DeepSeek API Key is not configured.", 503);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.2,
            max_tokens: 2_400,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: TREND_ANALYSIS_SYSTEM_PROMPT },
              { role: "user", content: buildTrendAnalysisPrompt(results) },
            ],
          }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new ModelAdapterError("UPSTREAM_ERROR", "DeepSeek trend analysis request failed.", 502);
        const payload = await response.json().catch(() => {
          throw new ModelAdapterError("INVALID_RESPONSE", "DeepSeek returned invalid JSON.", 502);
        });
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          throw new ModelAdapterError("EMPTY_RESPONSE", "DeepSeek returned an empty analysis.", 502);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new ModelAdapterError("INVALID_JSON", "DeepSeek analysis was not valid JSON.", 502);
        }
        const core = validateTrendAnalysisCore(parsed, results);
        return {
          ...core,
          sourceReferences: results.map(({ id: resultId, title, sourceUrl }) => ({ resultId, title, sourceUrl })),
          metadata: {
            provider: "deepseek" as const,
            model: config.model,
            generatedAt: now().toISOString(),
            inputResultCount: results.length,
            schemaVersion: "1" as const,
            isMock: false,
          },
        };
      } catch (error) {
        if (error instanceof ModelAdapterError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new ModelAdapterError("TIMEOUT", "DeepSeek trend analysis request timed out.", 504);
        }
        throw new ModelAdapterError("UPSTREAM_ERROR", "Unable to reach DeepSeek trend analysis.", 502);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
