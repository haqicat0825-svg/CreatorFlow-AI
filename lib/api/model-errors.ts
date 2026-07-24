import { NextResponse } from "next/server";
import { ModelAdapterError } from "@/lib/providers/types";

export function modelErrorResponse(error: unknown) {
  if (error instanceof ModelAdapterError) {
    const safeMessages: Record<string, string> = {
      CONFIGURATION_MISSING: "服务端模型配置不完整或未启用。",
      UNAUTHORIZED: "模型服务鉴权失败，请检查服务端配置。",
      RATE_LIMITED: "模型服务请求过于频繁，请稍后重试。",
      TIMEOUT: "模型请求超时，请稍后重试。",
      EMPTY_RESPONSE: "模型返回内容为空。",
      TRUNCATED_RESPONSE: "模型返回内容被截断。",
      INVALID_JSON: "模型返回内容不是有效 JSON。",
      SCHEMA_MISMATCH: "模型返回内容不符合字段契约。",
      INVALID_RESPONSE: "模型返回了无效响应。",
      MODEL_UNAVAILABLE: "配置的模型当前不可用。",
      LOCAL_CLI_DISABLED: "Local CLI 当前未启用。",
      CONTENT_REJECTED: "请求未通过内容安全检查，请调整 Prompt。",
      UPSTREAM_ERROR: "模型服务暂时不可用。",
    };
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: safeMessages[error.code] ?? "模型服务暂时不可用。",
        diagnostics: error.diagnostics,
      },
    }, { status: error.status });
  }
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后重试。" } },
    { status: 500 },
  );
}
