import type { ContentTask, SafetyReport, TitleCandidate } from "@/lib/types";

export type GeneratedContent = {
  titles: TitleCandidate[];
  body: string;
  tags: string[];
  coverPrompt: string;
  safety: SafetyReport;
};

export interface TextModelAdapter {
  id: string;
  model: string;
  generate(task: ContentTask): Promise<GeneratedContent>;
}

export interface ImageModelAdapter {
  id: string;
  model: string;
  generatePrompt(task: ContentTask): Promise<{ prompt: string }>;
}
