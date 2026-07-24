"use client";
import { PageHeader } from "@/components/page-header";
import { ModelConfigCard } from "@/components/model-config-card";
import type { ModelConfig } from "@/lib/types";

const textModel: ModelConfig = { id: "text-primary", kind: "text", name: "DeepSeek-V4", provider: "local-cli", mode: "local-cli", status: "disconnected" };
const imageModel: ModelConfig = { id: "image-primary", kind: "image", name: "gpt-image-1", provider: "openai", mode: "image", status: "disconnected" };

export default function ModelsPage() {
  return <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
    <PageHeader eyebrow="Provider registry" title="Model Hub" description="在一个地方管理 CreatorFlow AI 团队使用的文案与视觉模型。当前为安全的 Mock 配置，不会发送或保存密钥。"/>
    <div className="mt-9 space-y-5">
      <ModelConfigCard title="文案生成模型" description="当前模型：DeepSeek-V4" initial={textModel} modes options={[{ value: "local-cli", label: "本地 CLI" }, { value: "cloud-api", label: "Cloud API" }]}/>
      <ModelConfigCard title="图片生成模型" description="当前支持服务端白名单 OpenAI Image 或 Demo / Mock" initial={imageModel} options={[{ value: "openai", label: "OpenAI Image" }, { value: "mock", label: "Demo / Mock" }]}/>
    </div>
  </main>;
}
