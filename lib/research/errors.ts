export type ResearchErrorCode =
  | "CLI_UNAVAILABLE"
  | "LOGIN_REQUIRED"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "SEARCH_BUSY"
  | "TIMEOUT"
  | "OUTPUT_TOO_LARGE"
  | "INVALID_RESPONSE"
  | "PLATFORM_BLOCKED"
  | "NETWORK_ERROR";

export class ResearchError extends Error {
  constructor(
    public readonly code: ResearchErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ResearchError";
  }
}

export function safeResearchMessage(error: unknown) {
  if (error instanceof ResearchError) return error.message;
  return "研究服务暂时不可用，请稍后再试。";
}
