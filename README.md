# Ads Tool Factory

面向广告优化师、增长团队和投放运营团队的广告文案工具工厂模板。它用于把成熟的广告文案生成流程，复制成适配不同产品、市场和投放场景的独立工具。

## Fastest Way To Use

把下面这段话直接粘贴给任意 AI coding agent。它会先从 GitHub 获取模板，再向你弹出产品接入需求表，最后基于你的产品资料生成你自己的广告文案工具。

```text
请从这个 GitHub 仓库获取 Ads Tool Factory 模板：
https://github.com/unthinker69/ads-tool-factory-share-kit

请把它下载、clone 或 fork 到我自己的工作区，然后基于这个模板为我的产品创建一个广告文案生成工具。不要修改原作者仓库；所有改动都只发生在我自己的副本里。

获取仓库后，请先阅读 README_FOR_ANY_AI.md、docs/BASELINE_TOOL_SPEC.md、docs/PRODUCT_INTAKE_FORM.md、docs/PROMOTION_PROTOCOL.md、docs/RELEASE_CHECKLIST.md。

第一步不要直接开发。请先弹出一份产品接入需求表，要求我提供产品名、投放国家、产品语言、目标人群、投放版位、产品链接、核心功能、品牌书、产品文档、功能文档、合规限制、参考素材和期望 UI 风格。

拿到资料后，请基于品牌书、产品文档和产品链接，定制这个工具的默认参数、广告文案策略、评分规则、UI 配色和界面风格。必须保留 docs/BASELINE_TOOL_SPEC.md 中列出的账号、模型管理、模型池、外部 API、评分控制、批量生成、复制导出和线上部署安全能力。

UI 必须保留现有工具的展示形式和设计结构：顶部品牌栏、左侧配置面板、右侧结果区、Key/模型管理面板、模型池管理、API 调用区和评分结果卡片都要保留。只允许根据产品信息调整配色、默认选项、文案语气，以及左上角品牌展示部分。所有产品事实必须来自我提供或可验证的资料，不要编造。
```

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
- `docs/BASELINE_TOOL_SPEC.md`
- `docs/PRODUCT_INTAKE_FORM.md`
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

导入只更新通用模板层，不覆盖产品分支和本地分发记录。遇到本地团队已经改过的同名文件时，脚本会提示选择：

- replace: 使用模板新版本替换本地文件
- skip: 保留本地文件
- keep-both: 同时保留本地文件，并把模板版本保存为 `.template-<timestamp>` 候选文件
- report: 只生成冲突报告，不改文件

如果只想先看会发生什么：

```powershell
.\scripts\update_from_template.ps1 -TemplateRoot "D:\ads-tool-factory-share-kit" -Mode report
```

对于功能相似但文件不同的情况，也可以提前登记到：

```text
docs\feature_registry.md
```

模板更新会对比 `docs\FEATURE_MANIFEST.md` 和本地 `docs\feature_registry.md` 的 feature id / tags。比如双方都涉及 `ui-theme,color`，即使不是同一个文件，也会进入人工选择流程。

## Validation

发布或交付前运行：

```powershell
.\tests\validate_share_kit.ps1
```
