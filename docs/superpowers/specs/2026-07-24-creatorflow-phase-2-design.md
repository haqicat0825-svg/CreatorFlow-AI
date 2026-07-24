# CreatorFlow AI Phase 2 设计规范

## 1. 目标

在不推翻现有五个页面和韩系高级 SaaS 视觉系统的前提下，为 CreatorFlow AI 增加模型配置、内容任务创建、生成上下文、模型可见性与内容真实性检查能力。所有功能继续使用 Mock Data，但通过统一接口为 OpenAI、DeepSeek、图片 API 和本地 CLI 留出接入点。

## 2. 新增页面

### 2.1 Model Hub `/models`

页面采用两个大型配置面板，不使用传统设置表格。

文案生成模型：

- 当前模型：DeepSeek-V4
- 运行模式：本地 CLI / Cloud API
- 字段：模型名称、API Key、Base URL
- 状态：Connected / Disconnected
- “测试连接”和“保存配置”均为本地模拟操作

图片生成模型：

- 当前模型：Image Generation Model
- Provider：DALL-E / Flux / Stable Diffusion
- 字段：模型名称、API Key、Base URL
- 状态显示与模拟连接测试

API Key 默认遮罩，只保存在当前组件状态中，不写入源码、Local Storage 或 Session Storage。

### 2.2 Content Brief `/create-task`

单页任务创建表单包含：

- 主题：默认示例“秋季韩系穿搭”
- 目标用户多选：18-25岁女生、学生党、职场女性、穿搭爱好者
- 内容风格多选：韩系甜美、清冷感、高级感、日系、复古
- 内容目标单选：涨粉、种草、品牌推广
- Use Content Intelligence 开关

点击“开始生成”后，表单生成 `ContentTask`，写入 `sessionStorage`，再跳转 `/creator`。未填写主题时显示明确的行内错误并保持当前页面。

Dashboard 增加“创建新任务”入口，但保留原有布局和今日任务主次关系。

## 3. 导航

侧边栏新增 Model Hub。Content Brief 作为创建动作入口，不占用常驻导航项。

桌面端继续使用左侧导航。移动端六个主导航项在底部容器内横向滚动，保持 44px 以上的点击区域，避免图标拥挤。

## 4. Content Creator 升级

Creator 页面保留现有三栏结构，并增加：

- 顶部任务摘要：主题、人群、风格、内容目标、知识库状态
- 5 个标题候选，每个显示匹配度，选择后更新主标题
- 正文与 Tags 延续可编辑行为
- 封面区域显示由 Visual Agent 输出的 Prompt
- 无 Session 任务时使用内置 Mock Brief，不出现空页面

选择选题、标题候选或编辑正文时不修改全局种子数据。

## 5. Agent Workflow 升级

每个 `WorkflowStep` 新增 `model` 字段：

- Research Agent：DeepSeek-V4
- RAG Memory：CreatorFlow Vector Store
- Strategy Agent：DeepSeek-V4
- Writer Agent：GPT-4o
- Visual Agent：DALL-E
- Safety Guard：CreatorFlow Guard
- Human Review：Human

流程更新为：

Research Agent → RAG Memory → Strategy Agent → Writer Agent → Visual Agent → Safety Guard → Human Review

现有运行、暂停、重置逻辑继续适用七个节点。

## 6. Safety Guard

Safety Guard 节点执行四项检查：

- 是否存在空洞描述
- 是否重复内容
- 是否过度营销
- 是否符合平台规范

右侧新增质量面板，展示每项 Passed / Review 和 `Content Quality Score`。默认 Mock 分数为 92。状态不仅依赖颜色，同时显示文字和图标。

## 7. 类型与适配器结构

新增领域类型：

- `ModelProvider`
- `ModelConfig`
- `ContentTask`
- `TitleCandidate`
- `SafetyCheck`
- `SafetyReport`

新增 `lib/providers/`：

- `types.ts`：定义 `TextModelAdapter`、`ImageModelAdapter` 和返回值
- `mock.ts`：实现确定性的 Mock Adapter
- `index.ts`：统一导出与未来 Provider Registry 入口

适配器接口不接受组件状态对象，只接受明确的任务与配置数据。当前阶段不读取环境变量、不发送网络请求、不执行本地 CLI。

未来接入时增加：

- `openai.ts`
- `deepseek.ts`
- `image.ts`
- `local-cli.ts`

页面始终依赖适配器接口，不直接调用 SDK。

## 8. 数据流

```text
Model Hub（Mock 配置）
          ↓
Content Brief → sessionStorage ContentTask
          ↓
Content Creator → 标题 / 正文 / Tags / Cover Prompt
          ↓
Agent Workflow → Model 元信息 + Safety Report
```

Model Hub 配置在 Phase 2 中只模拟当前会话 UI，不与 ContentTask 持久化绑定。Creator 和 Workflow 使用 Mock Registry 中的默认模型映射，避免把假密钥存入浏览器。

## 9. 交互与状态

- Model Hub：模式切换、Provider 切换、密码显示/隐藏、模拟连接测试、保存提示
- Content Brief：标签多选、目标单选、知识库开关、表单校验、创建跳转
- Creator：任务摘要、5 标题候选、匹配度与封面 Prompt
- Workflow：七节点状态推进、模型标签、Safety Score
- 所有成功提示使用 `aria-live`
- 所有标签控件使用 `aria-pressed` 或原生表单语义

## 10. 验收标准

- `/models` 与 `/create-task` 可直接访问。
- 侧边栏可进入 Model Hub；Dashboard 可进入 Content Brief。
- Content Brief 创建任务后跳转 Creator，并正确显示主题、人群与风格。
- Creator 显示 5 个标题候选、正文、Tags 和封面 Prompt。
- Workflow 显示七个节点及各自模型。
- Safety Guard 显示四项检查和质量分数。
- Provider 接口与 Mock 实现存在，页面不包含真实 API 调用。
- 原有五页视觉风格与路由保持可用。
- TypeScript、测试和生产构建通过。
- 1440px 与 390px 无横向溢出。
