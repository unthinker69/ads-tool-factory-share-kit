# Worker API 契约

所有产品工具必须保持这些能力一致，方便外部 AI 调用。完整产品能力以 `docs/BASELINE_TOOL_SPEC.md` 为准；如果某个产品需要排除其中任一能力，必须先取得产品负责人的明确批准，并在发布说明中写出例外原因。

## 标准接口

- `POST /api/ad-copy`
- `POST /api/copy`
- `POST /api/score`
- `POST /api/translate`
- `POST /api/models`
- `GET /api/schema`
- `GET /api/openapi.json`
- `POST /api/auth/token`
- `GET /api/provider-pool`
- `POST /api/provider-pool`
- `GET /api/provider-pool/assignment`

## 数据稳定性

不要随意改：

- 用户登录体系
- Cloudflare KV 数据结构
- 浏览器 localStorage key
- personal API token 格式
- provider pool 的选择逻辑

Web UI 中存在的账号、BYOK、provider profile、model discovery、model pool、score control、batch generation 和 copy/export 能力，必须在 API schema 或 OpenAPI 中有对应说明或调用路径。不得出现网页端有能力、外部 AI API 无法调用，或 API 文档隐藏关键参数的情况。


## 前端账号会话标准

所有带云账号能力的产品工具必须提供退出登录入口。退出登录只允许清除当前浏览器保存的账号会话信息，例如产品自己的 `*_cloud_token` 和 `*_cloud_user`，并刷新登录状态、模型池展示和本地模型列表状态；不得删除云端账号、personal API token、已保存模型档案、API key 或任何产品模型池记录。

## 共享账号与模型档案标准

需要打通账号的产品工具应绑定同一个账号配置 KV，并共享这些记录：`user:*`、`user_name:*`、`token:*`、`profiles:<userId>`。产品自己的模型池选择必须使用产品专属 key，例如 `provider_pool:<product-slug>:<userId>`，不得写入其他产品的 pool 字段。

共享 `profiles` 时，所有接入同一 KV 的 Worker 必须使用同一个 `worker_app_secret`，否则只能看到模型档案但无法解密调用 API key。前端应把共享 profiles 显示为“共享云模型”，支持刷新、选择为当前模型、加入/移出本产品模型池；删除共享云模型必须提示会影响其他接入同一账号资料的工具。

## 外部 AI 调用面板标准

带云账号和 provider pool 的产品工具，应在 API Key/模型管理区提供一个独立的外部 API 调用面板。面板至少显示：登录状态、共享云模型档案数量、本产品 provider pool 状态、personal API token 状态，以及一条可复制的 `curl` 示例命令。

示例命令必须使用 `Authorization: Bearer rn_pat_...` 调用本产品的 `POST /api/ad-copy`，并默认不传 direct provider key。服务端在这种调用模式下必须优先使用本产品保存的 `provider_pool:<product-slug>:<userId>`；如果池为空，才允许按 active profile 或单一共享 profile 兜底。页面不得在命令、状态区或返回结果里渲染底层 provider API key。

`GET /api/schema` 的 auth 说明应明确：不传 `provider.profile_id` / `provider.profile_name` 时，会使用本产品保存的 provider pool，而不是其他产品的 pool。

继承该面板时必须对最终页面脚本做语法级验收，不能只执行 Worker 外层 `node --check`。如果产品使用内联 `<script>`，应从最终 HTML 中抽取实际脚本并执行 `node --check` 或等效浏览器语法检查；同时确认 `openModal`、`generate`、`cloudLogin`、`copyApiCommand` 等按钮入口函数存在。任何导致整段脚本解析失败的问题都必须先修复，否则不得分发或部署。

## 面向外部 AI 的 API 自说明标准

`GET /api/schema` 和 `GET /api/openapi.json` 必须把关键可调能力写清楚，避免外部 AI 只按默认值低效调用：

- `qty` 是每个类型、每个 category 的目标产出数量，范围 1-50。外部 AI 应根据用户要求动态设置，不应默认固定 5。
- `agent_id` 是稳定调用方/智能体 ID。多个智能体并发调用时，应传不同且稳定的 `agent_id`；服务端可用 `agent_sticky` 将不同智能体映射到本产品 provider pool 中不同模型。
- `provider_pool_mode` 应说明 `parallel` 和 `agent_sticky` 的差异；如果传了 `agent_id` 且未指定模式，允许默认走 `agent_sticky`。
- `score_control.targets` 是最低验收分，`score_control.quality_goal` 是期望高分目标。外部 AI 应在用户要求更高质量、更严格筛选或更高评分时主动提高这些字段，同时提示高目标可能增加耗时、成本或减少返回数量。
- `score_control.quality_goal` 是可选追高目标，不是默认 pass/fail 门槛。吞吐优先或大批量调用时应允许省略；当用户明确把 targets 降到 6 时，API 示例和自说明不得继续保留 `quality_goal: 9`，应同步降到 6-7 或省略。
- 生成循环不得在 `quality_goal` 未显式传入时，为了隐式高分目标继续追加尝试；服务端响应应暴露 `quality_goal_explicit` 或等效字段，方便外部 AI 判断是否正在追额外高分。
- API 自说明必须重复产品自己的不可覆盖限制，例如国家、语言、设备默认值和合规禁区。
