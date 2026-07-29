import type { Metadata } from "next";
import { DemoShowcase } from "@/components/demo-showcase";

export const metadata: Metadata = {
  title: "演示案例 · CreatorFlow AI",
  description: "韩系穿搭账号增长方案完整 Demo Case",
};

export default function DemoPage() {
  return <DemoShowcase />;
}
