# CreatorFlow AI Phase 3D 状态

## 当前产品状态

- Phase 3D / Research：Beta
- Research Beta 不作为 CreatorFlow MVP 完成的阻塞项
- 已完成的只读、安全和人工确认架构继续保留
- 真实端到端搜索属于可选验收
- 当前未宣称已经稳定支持生产环境

真实小红书 CLI 搜索目前属于实验能力，不作为 CreatorFlow MVP 完成的阻塞条件。CLI 可用且登录有效时，用户可以主动触发只读搜索；不可用时明确回退为 Demo/Mock。所有搜索结果必须经过人工选择和确认后才能进入知识库。

## CreatorFlow MVP 核心链路

手动添加参考内容  
→ 本地知识库  
→ RAG 检索  
→ DeepSeek 生成内容  
→ Safety Guard  
→ 人工审核

以上链路是 CreatorFlow MVP 最终验收的必要条件，Phase 3D / Research Beta 不再阻塞 MVP 验收。

## 保留的 Research Beta 能力

- `xiaohongshu-cli` 只读 Adapter
- `/api/research/status`
- `/api/research/search`
- `/api/research/import`
- 用户主动触发搜索、人工选择和二次确认
- 本地知识库持久化与去重机制
- RAG 检索能力、`ragUsed` 和 `ragReferences`
- 明确标记的 Demo/Mock 回退
- CLI 限流、冷却时间、超时、输出上限和安全过滤

Demo/Mock 仅用于安全回退和演示，不代表真实平台数据。Mock 条目保持明确标记，并按现有规则以草稿状态保存和降低 RAG 权重。

## 安全边界

Research Beta 仅允许用户主动触发受控的只读搜索，不支持：

- 自动发布
- 点赞、收藏、评论、关注等互动操作
- 自动登录
- 验证码绕过
- 后台轮询
- 自动翻页

CLI 不可用或未登录时，系统必须明确回退为 Demo/Mock，不得把回退结果描述为真实平台数据。真实搜索结果也必须经过人工选择和二次确认后才能进入本地知识库。

## 验收说明

MVP 必须验收“手动添加参考内容 → 本地知识库 → RAG 检索 → DeepSeek 生成内容 → Safety Guard → 人工审核”的核心内容生产链路。

真实 CLI 端到端搜索与人工入库验证是 Research Beta 的可选验收项。未完成该可选验收不影响 CreatorFlow MVP 状态，也不代表真实搜索已达到生产环境稳定性要求。
