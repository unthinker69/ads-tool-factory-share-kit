# Feature Manifest

This file lists reusable template features that may be distributed downstream.

The update script uses `id`, `tags`, and `files` to detect semantic overlap with downstream-local features. For example, if the template adds a UI theme feature and the downstream factory already has a local color/theme feature, the update must ask before replacing, skipping, or keeping both.

## score-control-throughput-aware

- title: Throughput-aware score control
- tags: score-control, quality-goal, retry, throughput
- files: modules\score-control\README.md, core\worker_contract.md, README_FOR_ANY_AI.md

## provider-pool-agent-assignment

- title: Provider pool and agent-sticky assignment
- tags: provider-pool, agent-id, external-ai, model-routing
- files: modules\provider-pool\README.md, core\worker_contract.md, README_FOR_ANY_AI.md

## complete-tool-baseline

- title: Complete product tool baseline
- tags: baseline, byok, account, provider-profile, model-discovery, model-pool, external-ai, api-token, score-control, batch-generation, export, persistence
- files: docs\BASELINE_TOOL_SPEC.md, templates\full-tool-source\README.md, templates\full-tool-source\public\index.html, templates\full-tool-source\src\worker_api_template.js, README_FOR_ANY_AI.md, docs\RELEASE_CHECKLIST.md, templates\product\TASK.md.template, README.md

## ui-structure-preservation

- title: Preserve current tool UI structure
- tags: ui-structure, layout, branding, color, key-management, model-pool, results-panel
- files: docs\BASELINE_TOOL_SPEC.md, templates\full-tool-source\README.md, templates\full-tool-source\public\index.html, README_FOR_ANY_AI.md, docs\RELEASE_CHECKLIST.md, templates\product\TASK.md.template, README.md

## external-ai-api-guidance

- title: External AI API usage guidance
- tags: openapi, schema, external-ai, api-guidance, qty
- files: core\worker_contract.md, README_FOR_ANY_AI.md, templates\product\TASK.md.template

## local-distribution-governance

- title: Local-only selective distribution governance
- tags: distribution, governance, branch-optimization, upstream-policy
- files: docs\PROMOTION_PROTOCOL.md, docs\UPSTREAM_POLICY.md, docs\distribution_queue.md, README.md

## ui-theme-token-guidance

- title: UI theme and color-token guidance
- tags: ui-theme, color, branding, interface-customization
- files: templates\product\brief.md.template, templates\product\TASK.md.template, docs\PRODUCT_INTAKE_FORM.md, README_FOR_ANY_AI.md

## product-intake-onboarding

- title: Product intake form for new branch onboarding
- tags: onboarding, product-intake, brand-book, product-docs, requirements-form
- files: docs\PRODUCT_INTAKE_FORM.md, templates\product\brief.md.template, templates\product\TASK.md.template, README.md
