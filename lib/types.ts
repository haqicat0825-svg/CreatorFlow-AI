export type AgentStatus = "working" | "ready" | "waiting";
export type WorkflowStatus = "completed" | "running" | "waiting";
export type Agent = { id: string; name: string; role: string; status: AgentStatus; detail?: string; icon: "search" | "sparkles" | "pen" | "shield" };
export type LibraryItem = { id: string; title: string; category: "爆款案例" | "我的风格" | "标题公式" | "视觉素材"; tags: string[]; score: number; saved: boolean; aspect: "portrait" | "square" | "tall"; colors: [string, string, string] };
export type WorkflowStep = { id: string; name: string; subtitle: string; status: WorkflowStatus; output?: string; duration?: string };
export type Draft = { title: string; body: string; tags: string[]; coverColors: [string, string, string] };
export type Topic = { id: string; label: string; title: string; match: number; tags: string[]; draft: Draft };
export type CoverCandidate = { id: string; alt: string; composition: string; colors: [string, string, string] };
