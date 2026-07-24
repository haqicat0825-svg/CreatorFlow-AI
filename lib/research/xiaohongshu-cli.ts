import type { LoginStatus, ResearchAdapter, SearchRequest, SearchResult } from "./types";
import { ResearchError } from "./errors";
import { executeReadOnlyCli, filterSensitiveFields, parseSafeJsonOutput } from "./cli-runtime";

export const XIAOHONGSHU_CLI_AUDIT = {
  available: true,
  auditedAt: "2026-07-24",
  version: "0.6.4",
  repository: "https://github.com/jackwener/xiaohongshu-cli",
  executable: process.platform === "win32" ? "xhs.exe" : "xhs",
  reason: "已审计 xhs 0.6.4 的 status/search 参数和 JSON schema；仅启用固定只读命令。",
  supportsStructuredReadOnlySearch: true,
} as const;

export class XiaohongshuCliAdapter implements ResearchAdapter {
  constructor(
    private readonly execute: typeof executeReadOnlyCli = executeReadOnlyCli,
  ) {}

  async checkLoginStatus(): Promise<LoginStatus> {
    try {
      const result = await this.execute(
        XIAOHONGSHU_CLI_AUDIT.executable,
        ["status", "--json"],
        { allowNonZero: true },
      );
      const envelope = parseEnvelope(result.stdout);
      if (!envelope.ok) {
        return {
          available: true,
          loggedIn: false,
          provider: "xiaohongshu-cli",
          safeMessage: envelope.errorCode === "not_authenticated"
            ? "xiaohongshu-cli 已接入但尚未登录；当前搜索将使用 Demo/Mock。请自行通过 CLI 官方流程登录。"
            : "xiaohongshu-cli 可用，但登录状态检查未通过。",
        };
      }
      return {
        available: true,
        loggedIn: envelope.authenticated === true,
        provider: "xiaohongshu-cli",
        safeMessage: envelope.authenticated
          ? "xiaohongshu-cli 已连接并登录；搜索将使用真实只读结果。"
          : "xiaohongshu-cli 已接入但尚未登录；当前搜索将使用 Demo/Mock。",
      };
    } catch (error) {
      if (error instanceof ResearchError && error.code === "CLI_UNAVAILABLE") {
        return {
          available: false,
          loggedIn: false,
          provider: "xiaohongshu-cli",
          safeMessage: "未检测到 xiaohongshu-cli；当前搜索将使用 Demo/Mock。",
        };
      }
      return {
        available: true,
        loggedIn: false,
        provider: "xiaohongshu-cli",
        safeMessage: "xiaohongshu-cli 状态检查失败；未返回任何账号或凭证信息。",
      };
    }
  }

  async searchContent(request: SearchRequest): Promise<SearchResult[]> {
    const result = await this.execute(
      XIAOHONGSHU_CLI_AUDIT.executable,
      [
        "search",
        request.query,
        "--sort",
        request.sortMode ?? "general",
        "--type",
        request.contentType ?? "all",
        "--page",
        "1",
        "--json",
      ],
      { allowNonZero: true },
    );
    const envelope = parseEnvelope(result.stdout);
    if (!envelope.ok) throw mapCliError(envelope.errorCode);
    const items = Array.isArray(envelope.data?.items) ? envelope.data.items : [];
    return items.slice(0, request.limit).map((item, index) => normalizeCliItem(item, index));
  }
}

type CliEnvelope = {
  ok: boolean;
  data?: Record<string, unknown>;
  authenticated?: boolean;
  errorCode?: string;
};

function parseEnvelope(raw: string): CliEnvelope {
  const filtered = parseSafeJsonOutput(raw) as Record<string, unknown>;
  if (filtered.schema_version !== "1" || typeof filtered.ok !== "boolean") {
    throw new ResearchError("INVALID_RESPONSE", "CLI JSON schema 无效。", 502);
  }
  const data = filtered.data && typeof filtered.data === "object"
    ? filtered.data as Record<string, unknown>
    : undefined;
  const error = filtered.error && typeof filtered.error === "object"
    ? filtered.error as Record<string, unknown>
    : undefined;
  return {
    ok: filtered.ok,
    data,
    authenticated: data?.authenticated === true,
    errorCode: typeof error?.code === "string" ? error.code : undefined,
  };
}

function normalizeCliItem(raw: unknown, index: number): SearchResult {
  if (!raw || typeof raw !== "object") throw new ResearchError("INVALID_RESPONSE", "CLI 搜索条目无效。", 502);
  const item = filterSensitiveFields(raw) as Record<string, unknown>;
  const card = item.note_card && typeof item.note_card === "object"
    ? item.note_card as Record<string, unknown>
    : item;
  const user = card.user && typeof card.user === "object" ? card.user as Record<string, unknown> : {};
  const interact = card.interact_info && typeof card.interact_info === "object"
    ? card.interact_info as Record<string, unknown>
    : {};
  const id = stringValue(item.id) || stringValue(card.note_id);
  const title = stringValue(card.title) || stringValue(card.display_title);
  if (!id || !title) throw new ResearchError("INVALID_RESPONSE", "CLI 搜索条目缺少 ID 或标题。", 502);
  const liked = numericMetric(interact.liked_count);
  return {
    id,
    title: title.slice(0, 200),
    summary: title.slice(0, 200),
    author: stringValue(user.nickname)?.slice(0, 100),
    sourceUrl: `https://www.xiaohongshu.com/explore/${encodeURIComponent(id)}`,
    metrics: liked === undefined ? undefined : { likes: liked },
    tags: [],
    source: "xiaohongshu",
    retrievedAt: new Date().toISOString(),
    isMock: false,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numericMetric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/u.test(value.trim())) return Number(value);
  return undefined;
}

function mapCliError(code?: string) {
  if (code === "not_authenticated") return new ResearchError("LOGIN_REQUIRED", "xiaohongshu-cli 尚未登录。", 401);
  if (code === "verification_required" || code === "ip_blocked") {
    return new ResearchError("PLATFORM_BLOCKED", "平台要求验证或限制访问，请在官方页面处理；CreatorFlow 不会绕过。", 403);
  }
  return new ResearchError("INVALID_RESPONSE", "xiaohongshu-cli 搜索失败。", 502);
}
