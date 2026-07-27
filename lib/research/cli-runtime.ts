import { spawn } from "node:child_process";
import { ResearchError } from "./errors";
import { RESEARCH_CONFIG } from "./types";

const sensitiveKeys = /cookie|token|secret|password|authorization|credential|qrcode/i;

export type CliExecutionResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function buildCliEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
): NodeJS.ProcessEnv {
  return {
    PATH: env.PATH,
    SystemRoot: env.SystemRoot,
    NODE_ENV: env.NODE_ENV,
    USERPROFILE: env.USERPROFILE,
    HOME: env.HOME,
    APPDATA: env.APPDATA,
    LOCALAPPDATA: env.LOCALAPPDATA,
    HOMEDRIVE: env.HOMEDRIVE,
    HOMEPATH: env.HOMEPATH,
    HTTP_PROXY: env.HTTP_PROXY,
    HTTPS_PROXY: env.HTTPS_PROXY,
    ALL_PROXY: env.ALL_PROXY,
    NO_PROXY: env.NO_PROXY,
    PYTHONUTF8: "1",
  } as NodeJS.ProcessEnv;
}

export async function executeReadOnlyCli(
  executable: string,
  args: readonly string[],
  options: { timeoutMs?: number; maxOutputBytes?: number; allowNonZero?: boolean } = {},
) {
  const timeoutMs = options.timeoutMs ?? RESEARCH_CONFIG.timeoutMs;
  const maxOutputBytes = options.maxOutputBytes ?? RESEARCH_CONFIG.maxOutputBytes;
  return new Promise<CliExecutionResult>((resolve, reject) => {
    const child = spawn(executable, [...args], {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: buildCliEnvironment(),
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const finish = (error?: Error, value?: CliExecutionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value!);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new ResearchError("TIMEOUT", "CLI 查询超时，未自动重试。", 504));
    }, timeoutMs);
    const collect = (target: Buffer[], chunk: Buffer) => {
      total += chunk.length;
      if (total > maxOutputBytes) {
        child.kill();
        finish(new ResearchError("OUTPUT_TOO_LARGE", "CLI 输出超过安全上限。", 502));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdoutChunks, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderrChunks, chunk));
    child.on("error", () => finish(new ResearchError("CLI_UNAVAILABLE", "无法启动 xiaohongshu-cli。", 503)));
    child.on("close", exitCode => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (exitCode !== 0 && !options.allowNonZero) return finish(classifyCliFailure(`${stdout}\n${stderr}`));
      finish(undefined, { stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

export function parseSafeJsonOutput(raw: string) {
  try {
    return filterSensitiveFields(JSON.parse(raw));
  } catch {
    throw new ResearchError("INVALID_RESPONSE", "CLI 未返回有效 JSON。", 502);
  }
}

export function filterSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(filterSensitiveFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKeys.test(key))
      .map(([key, item]) => [key, filterSensitiveFields(item)]),
  );
}

export function classifyCliFailure(output: string) {
  const safe = output.slice(0, 2_000).toLowerCase();
  if (/captcha|验证码|访问限制|risk control|风控|forbidden|拒绝/.test(safe)) {
    return new ResearchError("PLATFORM_BLOCKED", "平台要求验证或拒绝访问，请在官方 CLI 流程中处理；CreatorFlow 不会绕过。", 403);
  }
  if (/login|登录|unauthorized/.test(safe)) {
    return new ResearchError("LOGIN_REQUIRED", "需要登录，请在官方 CLI 流程中自行完成。", 401);
  }
  if (/network|timeout|econnreset|temporary/.test(safe)) {
    return new ResearchError("NETWORK_ERROR", "CLI 遇到短暂网络错误。", 503);
  }
  return new ResearchError("INVALID_RESPONSE", "CLI 查询失败。", 502);
}
