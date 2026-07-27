import { createHash } from "node:crypto";
import type { LoginStatus, ResearchAdapter, SearchRequest, SearchResult } from "./types";
import { ResearchError } from "./errors";
import {
  classifyCliFailure,
  executeReadOnlyCli,
  filterSensitiveFields,
  parseSafeJsonOutput,
} from "./cli-runtime";

export const XIAOHONGSHU_CLI_AUDIT = {
  available: true,
  auditedAt: "2026-07-24",
  version: "0.6.4",
  repository: "https://github.com/jackwener/xiaohongshu-cli",
  executable: "xhs",
  compatibleExecutables: ["xhs", "xiaohongshu"],
  reason: "已审计 xhs 0.6.4 的 status/search 参数和 JSON schema；仅启用固定只读命令。",
  supportsStructuredReadOnlySearch: true,
} as const;

export class XiaohongshuCliAdapter implements ResearchAdapter {
  constructor(
    private readonly execute: typeof executeReadOnlyCli = executeReadOnlyCli,
  ) {}

  async checkLoginStatus(): Promise<LoginStatus> {
    try {
      const result = await this.executeAuditedCommand(
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
    const result = await this.executeAuditedCommand(
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
    if (result.exitCode !== 0) {
      const envelope = tryParseEnvelope(result.stdout);
      if (envelope && !envelope.ok) throw mapCliError(envelope.errorCode);
      throw classifyCliFailure(`${result.stdout}\n${result.stderr}`);
    }
    const envelope = parseEnvelope(result.stdout);
    if (!envelope.ok) throw mapCliError(envelope.errorCode);
    const items = Array.isArray(envelope.data?.items) ? envelope.data.items : [];
    return items
      .map(normalizeCliItem)
      .filter((item): item is SearchResult => item !== undefined)
      .slice(0, request.limit);
  }

  private async executeAuditedCommand(
    args: readonly string[],
    options: { allowNonZero?: boolean } = {},
  ) {
    let unavailable: ResearchError | undefined;
    for (const executable of XIAOHONGSHU_CLI_AUDIT.compatibleExecutables) {
      try {
        return await this.execute(executable, args, options);
      } catch (error) {
        if (!(error instanceof ResearchError) || error.code !== "CLI_UNAVAILABLE") throw error;
        unavailable = error;
      }
    }
    throw unavailable ?? new ResearchError("CLI_UNAVAILABLE", "无法启动 xiaohongshu-cli。", 503);
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

function tryParseEnvelope(raw: string) {
  try {
    return parseEnvelope(raw);
  } catch {
    return undefined;
  }
}

function normalizeCliItem(raw: unknown): SearchResult | undefined {
  if (!raw || typeof raw !== "object") throw new ResearchError("INVALID_RESPONSE", "CLI 搜索条目无效。", 502);
  const rawItem = raw as Record<string, unknown>;
  const item = filterSensitiveFields(raw) as Record<string, unknown>;
  const card = item.note_card && typeof item.note_card === "object"
    ? item.note_card as Record<string, unknown>
    : item;
  const user = card.user && typeof card.user === "object" ? card.user as Record<string, unknown> : {};
  const interact = card.interact_info && typeof card.interact_info === "object"
    ? card.interact_info as Record<string, unknown>
    : {};
  const cover = card.cover && typeof card.cover === "object"
    ? card.cover as Record<string, unknown>
    : {};
  const cliUrl = safeXiaohongshuUrl(
    stringValue(item.url)
      || stringValue(item.link)
      || stringValue(item.source_url)
      || stringValue(item.sourceUrl)
      || stringValue(card.url)
      || stringValue(card.link),
  );
  const id = stringValue(item.note_id)
    || stringValue(card.note_id)
    || noteIdFromSearchResultUrl(cliUrl)
    || stableTokenId(rawItem.xsec_token)
    || stringValue(item.id);
  const title = stringValue(card.display_title) || stringValue(card.title);
  if (!id || !title) return undefined;
  const author = stringValue(user.nickname) || stringValue(card.author);
  const summary = stringValue(card.summary)
    || stringValue(card.content)
    || stringValue(card.desc)
    || stringValue(item.summary)
    || stringValue(item.content)
    || stringValue(item.desc)
    || title;
  const liked = numericMetric(
    interact.liked_count
      ?? card.liked
      ?? card.likes
      ?? card.liked_count,
  );
  const saved = numericMetric(
    interact.collected_count,
  );
  const comments = numericMetric(
    interact.comment_count,
  );
  const coverImage = safeHttpUrl(stringValue(cover.url_default));
  const images = [
    ...imageUrlsFromList(card.image_list),
    ...imageUrlsFromList(item.image_list),
  ];
  const uniqueImages = [...new Set([coverImage, ...images].filter((image): image is string => Boolean(image)))];
  return {
    id,
    title: title.slice(0, 200),
    summary: summary.slice(0, 500),
    author: author?.slice(0, 100),
    coverImage,
    images: uniqueImages.length ? uniqueImages : undefined,
    likes: liked,
    saves: saved,
    comments,
    url: cliUrl ?? `https://www.xiaohongshu.com/explore/${encodeURIComponent(id)}`,
    sourceUrl: cliUrl ?? `https://www.xiaohongshu.com/explore/${encodeURIComponent(id)}`,
    thumbnailUrl: coverImage,
    metrics: liked === undefined && saved === undefined && comments === undefined
      ? undefined
      : {
          ...(liked === undefined ? {} : { likes: liked }),
          ...(saved === undefined ? {} : { saves: saved }),
          ...(comments === undefined ? {} : { comments }),
        },
    tags: [],
    source: "xiaohongshu",
    retrievedAt: new Date().toISOString(),
    isMock: false,
  };
}

function imageUrlsFromList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (typeof entry === "string") {
      const url = safeHttpUrl(entry);
      return url ? [url] : [];
    }
    if (!entry || typeof entry !== "object") return [];
    const image = entry as Record<string, unknown>;
    const direct = safeHttpUrl(
      stringValue(image.url_default)
        || stringValue(image.url)
        || stringValue(image.src),
    );
    if (direct) return [direct];
    if (!Array.isArray(image.info_list)) return [];
    return image.info_list.flatMap(info => {
      if (!info || typeof info !== "object") return [];
      const url = safeHttpUrl(stringValue((info as Record<string, unknown>).url));
      return url ? [url] : [];
    });
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numericMetric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/gu, "");
    if (/^\d+$/u.test(normalized)) return Number(normalized);
  }
  return undefined;
}

function safeXiaohongshuUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://www.xiaohongshu.com");
    if (url.hostname !== "xiaohongshu.com" && !url.hostname.endsWith(".xiaohongshu.com")) return undefined;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function safeHttpUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function noteIdFromSearchResultUrl(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value).pathname.match(/\/search_result\/([A-Za-z0-9_-]+)/u)?.[1];
  } catch {
    return undefined;
  }
}

function stableTokenId(value: unknown) {
  const token = stringValue(value);
  return token
    ? `xsec-${createHash("sha256").update(token).digest("hex").slice(0, 20)}`
    : undefined;
}

function mapCliError(code?: string) {
  if (code === "not_authenticated") return new ResearchError("LOGIN_REQUIRED", "xiaohongshu-cli 尚未登录。", 401);
  if (code === "verification_required" || code === "ip_blocked") {
    return new ResearchError("PLATFORM_BLOCKED", "平台要求验证或限制访问，请在官方页面处理；CreatorFlow 不会绕过。", 403);
  }
  return new ResearchError("INVALID_RESPONSE", "xiaohongshu-cli 搜索失败。", 502);
}
