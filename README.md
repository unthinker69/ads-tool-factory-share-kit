# Ads Tool Factory

面向广告优化师、增长团队和投放运营团队的广告文案工具工厂模板。它用于把成熟的广告文案生成流程，复制成适配不同产品、市场和投放场景的独立工具。

该模板适合用于搭建：

- 产品专属广告文案生成器
- Google App Campaign 素材资产生成工具
- 多品类批量文案生成工具
- 可被外部 AI 调用的广告文案 API
- 带评分控制、模型池和 BYOK 的内部投放效率工具

## Core Capabilities

- Per-user BYOK: 每个使用者配置自己的模型 key。
- Provider pool: 支持多模型池和 agent-sticky 分配。
- External AI API: 通过 OpenAPI/schema 让其他 AI 工具可调用。
- Score control: 支持最低评分门槛、候选排序、吞吐优先默认值和动态重试提示。
- Selective distribution: 产品分支优化默认不扩散，只有明确授权后才可分发到 core/modules。
- Release checklist: 面向上线验收、API 可用性、数据隔离和合规边界的检查清单。

## Quick Start

```powershell
cd <repo>
.\scripts\init_factory.ps1 -FactoryRoot "D:\MyAdsToolFactory" -OwnerName "your-team"
cd D:\MyAdsToolFactory
.\scripts\new_product.ps1 -Slug my-product -DisplayName "My Product" -Industry "utility-app" -BasedOn "share-kit"
```

然后把这个文件发给你的 AI：

```text
D:\MyAdsToolFactory\products\my-product\TASK.md
```

## AI Agent Workflow

如果团队使用 Claude、Cursor、Gemini、Kimi、通义或其他 AI coding agent，把下面这些文件作为上下文发给它：

- `README_FOR_ANY_AI.md`
- `docs/PROMOTION_PROTOCOL.md`
- `docs/RELEASE_CHECKLIST.md`
- `products/<your-product>/TASK.md`

## Governance Model

每个团队在自己的环境里创建独立工厂、独立产品分支和独立部署配置。产品分支优化默认是本地能力，不会自动扩散到其他产品。

只有当负责人明确批准时，某个优化才可以进入 `docs/distribution_queue.md`，并被后续产品分支继承。

## Validation

发布或交付前运行：

```powershell
.\tests\validate_share_kit.ps1
```
