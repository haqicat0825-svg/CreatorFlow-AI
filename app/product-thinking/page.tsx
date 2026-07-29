import type { Metadata } from "next";
import { ProductThinking } from "@/components/product-thinking";

export const metadata: Metadata = {
  title: "产品思考 · CreatorFlow AI",
  description: "CreatorFlow AI 的用户痛点、产品定位、Agent 架构与产品原则",
};

export default function ProductThinkingPage() {
  return <ProductThinking />;
}
