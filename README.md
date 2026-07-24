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

每个团队在自己的环境里创建独立工厂、独立产品分支和独立部署配置。产品分支优化默认只在该团队自己的工厂内生效，不会回写到本仓库，也不会影响其他团队。

`docs/distribution_queue.md` 只管理当前本地工厂内部的继承关系。它不是上游同步机制，也不会把任何改动发送回本仓库。

本仓库是单向发布模板。上游版本只由仓库维护者更新；使用者应在自己的副本或 fork 中工作。

更多说明见：

- `docs/UPSTREAM_POLICY.md`
- `docs/MAINTAINER_RELEASE_FLOW.md`

## Downstream Updates

当模板发布新版本后，已有本地工厂可以选择导入更新：

```powershell
cd D:\MyAdsToolFactory
.\scripts\update_from_template.ps1 -TemplateRoot "D:\ads-tool-factory-share-kit"
```

导入只更新通用模板层，不覆盖产品分支和本地分发记录。

## Validation

发布或交付前运行：

```powershell
.\tests\validate_share_kit.ps1
```
