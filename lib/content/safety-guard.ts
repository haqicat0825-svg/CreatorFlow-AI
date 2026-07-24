import type { SafetyReport } from "@/lib/types";
import { assessCopyingRisk } from "./copying-risk";

const riskyMarketing = ["保证", "百分百", "绝对", "最强", "第一"];

export function runSafetyGuard(
  content: { body: string; titles: { title: string }[] },
  references: { title: string; content: string }[] = [],
  regenerated = false,
): SafetyReport {
  const combined = `${content.titles.map(item => item.title).join(" ")} ${content.body}`;
  const hollow = content.body.trim().length < 80;
  const normalizedTitles = content.titles.map(item => item.title.trim().toLowerCase());
  const repeated = new Set(normalizedTitles).size !== normalizedTitles.length;
  const marketing = riskyMarketing.some(term => combined.includes(term));
  const platformRisk = /(?:微信|手机号|加v|私信转账)/i.test(combined);
  const checks: SafetyReport["checks"] = [
    { id: "hollow", label: "是否存在空洞描述", status: hollow ? "review" : "passed" },
    { id: "repeat", label: "是否重复内容", status: repeated ? "review" : "passed" },
    { id: "marketing", label: "是否过度营销", status: marketing ? "review" : "passed" },
    { id: "platform", label: "是否符合平台规范", status: platformRisk ? "review" : "passed" },
  ];
  const copyingRisk = assessCopyingRisk(content, references, regenerated);
  return {
    score: Math.max(0, 100 - checks.filter(check => check.status === "review").length * 15
      - (copyingRisk.status === "review" ? 20 : 0)),
    checks,
    copyingRisk,
  };
}
