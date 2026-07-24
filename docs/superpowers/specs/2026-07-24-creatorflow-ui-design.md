# CreatorFlow AI 高保真 UI Prototype 设计规范

## 1. 目标与范围

CreatorFlow AI 是面向个人内容创作者、并可扩展到品牌新媒体团队的 AI 内容运营工作台。第一阶段仅实现高保真前端原型，使用模拟数据，不连接真实模型、数据库、认证或第三方平台。

原型必须包含五个可导航页面：

1. Dashboard：首页与 AI 内容团队概览
2. Content Intelligence Library：AI 内容资产库
3. Agent Workflow：AI 员工执行流程
4. Content Creator：选题、文案与封面的一体化创作界面
5. Visual Studio：封面 Prompt 与四图候选工作区

## 2. 体验原则

- 高级、温柔、专业，不使用黑色科技风。
- 不复制传统后台的表格、指标卡和均匀网格语言。
- 信息层级像韩系独立杂志编辑台，操作结构保持 SaaS 工作台的清晰度。
- 所有关键控件具有可见的 hover、focus、selected 与 disabled 状态。
- 动效服务于 Agent 状态与流程理解，并尊重 `prefers-reduced-motion`。

## 3. 视觉系统

### 3.1 色彩

- Canvas / 奶油白：`#F8F5EF`
- Surface / 暖白：`#FFFCF8`
- Mist Rose / 雾粉：`#D8A7AF`
- Rose Deep / 深雾粉：`#B77E89`
- Almond / 米杏：`#EADCCB`
- Berry Ink / 莓果正文：`#3F3033`
- Muted Ink / 次级正文：`#75686A`
- Sage / 完成状态：`#9EAC9D`
- Apricot / 运行状态：`#DFA778`
- Hairline / 边界：`rgba(63, 48, 51, 0.10)`

不使用大面积高饱和渐变。渐变仅用于状态轨道、柔光与选中态，透明度保持克制。

### 3.2 字体

- 英文展示标题：`DM Serif Display` 或同气质可用衬线体
- 中文与 UI 正文：`Noto Sans SC`
- 数值与微型标签：`Inter`

字体通过 `next/font` 加载，避免布局抖动。英文标题带有适度的编辑感，正文保持高可读性。

### 3.3 形状与质感

- 主卡片圆角：24–28px
- 小控件圆角：12–16px
- 阴影：低对比、宽扩散的暖色阴影
- 边界：半透明发丝线
- 图片：低饱和、自然光、韩系穿搭与咖啡馆生活方式

### 3.4 标志性元素

“AI Team Pulse”是一条带柔和流动光点的状态轨道。它出现在 Dashboard 的团队区与 Workflow 主流程中，用于表达多个 Agent 正在协作，而不是作为纯装饰。

## 4. 全局架构

### 4.1 导航

桌面端使用左侧常驻导航：

- 收窄状态约 76px，显示品牌符号、五个页面图标、帮助与用户入口。
- 当前页面以雾粉底色、莓果色图标和短标签强调。
- 宽屏可展开为约 220px，显示完整页面名称。

移动端改为底部五项导航。顶部保留品牌与当前页面操作。

### 4.2 页面框架

- Next.js App Router
- `app/`：五个页面路由与全局布局
- `components/`：可复用 UI 和业务组件
- `data/mock.ts`：所有模拟数据
- `lib/types.ts`：Agent、内容卡、工作流节点、选题与图片候选类型

核心组件：

- `AgentCard`
- `ContentCard`
- `WorkflowNode`
- `PromptCard`

辅助组件包括 `AppSidebar`、`PageHeader`、`StatusPill`、`TeamPulse`、`TopicCard`、`CoverCandidate`。

## 5. 页面设计

### 5.1 Dashboard

首页首屏不是普通 KPI 面板，而是“今日编辑台”：

- 顶部显示 CreatorFlow AI 与 “AI Content Operation Studio”。
- 左侧主区域是今日任务卡：生成一篇韩系穿搭内容，含当前进度、下一步与继续按钮。
- 右侧使用柔和的编辑日历与本周内容节奏。
- 下方“我的 AI 内容团队”采用 2×2 非对称卡片：
  - Research Agent / 内容研究专家 / Working / 发现热门趋势
  - Style Agent / 个人风格顾问 / Ready / 已学习：韩系甜美风
  - Writer Agent / 内容生成专家 / Waiting
  - Review Agent / 审核专家 / Ready
- Agent 图标使用统一的圆润线性图标；Working 使用脉冲点，Ready 使用微光圆环，Waiting 静止。
- Team Pulse 在卡片之间形成细线连接，表达协作关系。

### 5.2 Content Intelligence Library

页面气质为 Pinterest + Notion：

- 顶部是搜索、筛选与四个分类标签：爆款案例、我的风格、标题公式、视觉素材。
- 主区采用响应式 masonry 瀑布流，不做等高卡片网格。
- 每张 `ContentCard` 包含原创图片、标题、AI 标签与爆款评分。
- 标签示例：Korean Style、Soft Girl、Low Saturation、Cafe Scene。
- 点击卡片打开右侧详情抽屉；分类和标签筛选立即更新本地模拟结果。
- 收藏按钮具有本地选中状态。

### 5.3 Agent Workflow

任务标题为“生成一篇韩系穿搭内容”。

桌面端使用纵向偏斜的流程轨道，不是标准流程图：

Research Agent → RAG Memory → Strategy Agent → Writer Agent → Visual Agent → Human Review

- Completed：鼠尾草绿、勾选图标
- Running：杏色光晕、流动粒子
- Waiting：暖灰、静止
- `WorkflowNode` 展示角色、输出摘要、耗时或等待信息。
- 页面右侧为实时执行日志与任务摘要。
- “运行模拟”按钮在本地依次更新节点状态，支持暂停和重置。
- 小屏变为单列时间线。

### 5.4 Content Creator

桌面端是三栏编辑工作区：

- 左栏约 300px：10 个选题候选卡；包含方案编号、标题、匹配度、标签。示例：
  - 韩系秋冬温柔穿搭 / 95%
  - 100元平价韩系复刻
- 中栏为主要编辑器：标题、正文、标签均可编辑；提供“重新生成”模拟按钮和字符统计。
- 右栏约 320px：竖版封面预览、替换封面与保存草稿操作。
- 选择不同选题后，中间文案与右侧封面同步切换模拟内容。
- 平板端右栏折叠为抽屉；手机端使用“选题 / 文案 / 封面”分段切换。

### 5.5 Visual Studio

页面是柔和但专业的视觉生成台：

- 左侧 `PromptCard` 包含主题“韩系秋季穿搭”、生成 Prompt、比例、色调与构图选项。
- 右侧展示 2×2 四张封面候选，图片保持统一摄影方向但有不同构图。
- 选择图片后出现雾粉描边、放大预览与“设为封面”操作。
- “生成 4 张”触发本地 loading skeleton，再切换到另一组模拟候选。
- 不实现真实图片生成，不要求密钥。

## 6. 模拟数据与交互

所有数据在本地静态文件中维护。需要实现的真实前端交互：

- 页面导航
- Library 分类筛选、搜索、收藏与详情抽屉
- Workflow 运行、暂停、重置和状态推进
- Creator 选题切换、文本编辑、标签编辑与草稿成功提示
- Visual Studio Prompt 编辑、参数选择、模拟生成与封面选择

不实现：

- 真实 AI 请求
- 登录与权限
- 云端持久化
- 团队实时协作
- 内容发布平台连接

## 7. 图片策略

使用 Image Gen 创建一组统一风格的原创视觉资产，覆盖：

- 韩系秋冬穿搭
- 低饱和咖啡馆场景
- 柔和生活方式静物
- 四张秋季穿搭封面候选

资产构图为 UI 卡片和竖版封面服务，不使用带水印的外部图片，也不将整页截图作为 UI。

## 8. 可访问性与响应式

- 正文对比度满足 WCAG AA。
- 所有图标按钮提供可访问名称。
- 键盘焦点清晰可见。
- 状态不只依赖颜色，同时使用文字和图标。
- 桌面验证宽度：1440px。
- 移动验证宽度：390px。
- 小屏不出现水平滚动，编辑器与工作流保持可操作。

## 9. 验收标准

- 五个页面均可通过导航访问，无空白路由。
- 四个指定业务组件存在于 `components/` 并在页面复用。
- 页面视觉保持统一的奶油白、雾粉、米杏系统。
- Dashboard、Workflow 与 Visual Studio 包含有意义的状态动效。
- 所有核心模拟交互可在浏览器完成。
- TypeScript、lint 与 production build 通过。
- 通过桌面与移动端浏览器截图复核，无裁切、溢出和明显排版错误。
- 最终实现与批准的视觉概念逐项对照，修复可见偏差后交付。

## 10. 后续 AI 接入边界

后续以服务层替换模拟数据：

- `/api/research`：趋势研究与选题
- `/api/style-memory`：个人风格向量检索
- `/api/generate-content`：标题、正文与标签生成
- `/api/review`：质量与品牌一致性审核
- `/api/generate-image`：封面 Prompt 与图片生成

前端组件只依赖明确的 TypeScript 数据结构，未来接入 AI 时不重写页面结构。长任务使用流式状态或作业轮询；RAG Memory 独立为检索服务；人工审核是发布前的强制节点。
