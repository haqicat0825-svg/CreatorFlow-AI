import type { Agent, CoverCandidate, LibraryItem, Topic, WorkflowStep } from "@/lib/types";

export const agents: Agent[] = [
  { id: "research", name: "Research Agent", role: "内容研究专家", status: "working", detail: "发现热门趋势", icon: "search" },
  { id: "style", name: "Style Agent", role: "个人风格顾问", status: "ready", detail: "已学习：韩系甜美风", icon: "sparkles" },
  { id: "writer", name: "Writer Agent", role: "内容生成专家", status: "waiting", detail: "等待研究结果", icon: "pen" },
  { id: "review", name: "Review Agent", role: "审核专家", status: "ready", detail: "品牌规则已同步", icon: "shield" },
];

const palette: [string,string,string][] = [
  ["#d9b9af","#f2dfcf","#775b55"], ["#bdafa3","#eadfcf","#8d7b69"], ["#d6c1ba","#f4e7d7","#a88980"],
  ["#bec2ad","#eee4d1","#7f7967"], ["#d8a7af","#f3ddd6","#8b5e66"], ["#cab6a5","#f5e9d7","#9f7f68"],
  ["#c4a79d","#ecddce","#6f5551"], ["#c8c6b8","#f1e7d8","#887e6f"], ["#e0bcb2","#f5e7dc","#a2766c"],
];
export const libraryItems: LibraryItem[] = [
  ["秋日奶油系叠穿公式","小红书爆款案例库",["Korean Style","Low Saturation"],96,"tall","图片 · 标题 · 作者 · 点赞/收藏 · 标签 · 来源"],
  ["首尔咖啡馆的松弛感","个人审美风格库",["Cafe Scene","Soft Girl"],92,"portrait","收藏图片 · 风格标签 · 颜色 · 氛围 · AI 总结"],
  ["显贵的同色系穿法","爆款标题模板库",["Korean Style","Clean"],89,"square","AI 案例分析：结果词 + 具体方法"],
  ["低饱和通勤灵感","AI图片库",["Low Saturation","Office"],94,"tall","Seedream · Prompt · 2026-07-27"],
  ["针织衫的三种温柔搭配","小红书爆款案例库",["Soft Girl","Autumn"],91,"portrait","图片 · 标题 · 作者 · 点赞/收藏 · 标签 · 来源"],
  ["周末约会氛围板","个人审美风格库",["Cafe Scene","Warm"],87,"square","收藏图片 · 暖色 · 松弛氛围 · AI 总结"],
  ["100元复刻首尔街拍","爆款标题模板库",["Budget","Korean Style"],93,"portrait","AI 案例分析：数字锚点 + 复刻对象"],
  ["奶杏色视觉素材包","AI图片库",["Beige","Low Saturation"],90,"tall","OpenAI · Prompt · 2026-07-27"],
  ["小个子秋季层次感","小红书爆款案例库",["Petite","Autumn"],95,"square","图片 · 标题 · 作者 · 点赞/收藏 · 标签 · 来源"],
].map((v,i) => ({ id:`item-${i}`, title:v[0] as string, category:v[1] as LibraryItem["category"], tags:v[2] as string[], score:v[3] as number, saved:i===1, aspect:v[4] as LibraryItem["aspect"], description:v[5] as string, colors:palette[i] }));

export const workflowSteps: WorkflowStep[] = [
  { id:"research", name:"Research Agent", subtitle:"趋势与竞品研究", model:"DeepSeek-V4", status:"completed", output:"发现 24 个上升趋势", duration:"42s" },
  { id:"memory", name:"RAG Memory", subtitle:"检索个人风格记忆", model:"CreatorFlow Vector Store", status:"completed", output:"匹配 18 条风格偏好", duration:"8s" },
  { id:"strategy", name:"Strategy Agent", subtitle:"制定内容策略", model:"DeepSeek-V4", status:"running", output:"正在组合高匹配选题…" },
  { id:"writer", name:"Writer Agent", subtitle:"生成标题与正文", model:"GPT-4o", status:"waiting" },
  { id:"visual", name:"Visual Agent", subtitle:"生成封面方向", model:"DALL-E", status:"waiting" },
  { id:"safety", name:"Safety Guard", subtitle:"内容真实性与平台规范检查", model:"CreatorFlow Guard", status:"waiting" },
  { id:"human", name:"Human Review", subtitle:"由你进行最终确认", model:"Human", status:"waiting" },
];

const topicNames = ["韩系秋冬温柔穿搭","100元平价韩系复刻","首尔女生都在穿的针织衫","小个子显高叠穿公式","奶杏色通勤一周穿搭","咖啡馆约会氛围感","基础款也能穿出韩味","秋日半裙的四种搭法","低饱和衣橱配色指南","周末松弛感出片穿搭"];
export const topics: Topic[] = topicNames.map((title,i) => ({
  id:`topic-${i}`, label:`方案 ${i+1}`, title, match:95-i*2, tags:i%2?["平价复刻","高收藏"]:["韩系","温柔感"],
  draft:{ title:`${title}｜不费力的温柔感`, body:`最近很喜欢这种不刻意的韩系氛围。用柔软针织、低饱和配色和一点点层次感，就能把秋日的松弛与精致同时穿在身上。\n\n今天整理了 3 个可以直接照搬的小技巧：同色系打底、上短下长的比例，还有让造型更轻盈的奶油色配件。`, tags:["#韩系穿搭","#秋日灵感","#温柔风"], coverColors:palette[i%palette.length] }
}));

export const coverCandidates: CoverCandidate[] = [
  {id:"cover-1",alt:"候选封面 1",composition:"全身街拍",colors:palette[0]},
  {id:"cover-2",alt:"候选封面 2",composition:"咖啡馆半身",colors:palette[3]},
  {id:"cover-3",alt:"候选封面 3",composition:"细节特写",colors:palette[4]},
  {id:"cover-4",alt:"候选封面 4",composition:"杂志拼贴",colors:palette[7]},
];
