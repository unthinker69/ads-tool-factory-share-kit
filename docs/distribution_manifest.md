# Distribution Manifest

This repository contains only reusable capabilities approved for distribution into independent advertising-tool factories.

## Included Core Standards

- Complete baseline tool capability requirements.
- UI structure preservation and product-brand calibration rules.
- Cloud account logout behavior.
- Shared account/profile store with product-local provider pools.
- External AI API command panel requirements.
- AI-callable API guidance for quantity, agent assignment, provider pool modes, and score targets.
- Release governance for BYOK, product-local provider pools, OpenAPI, and regulated-claim safety.

## Included Modules

- `score-control`: minimum score targets, optional quality goals, candidate ranking, throughput-aware defaults, adaptive retry guidance.
- `provider-pool`: user-owned provider profiles, product-local model pools, agent-sticky assignment concepts.
- `baseline-tool-spec`: required account, model, API, scoring, batch, export, persistence, and UI-structure rules for every generated product tool.

## Excluded

- Original private product branches.
- Product-specific source code, claims, assets, or private implementation branches.
- Worker secrets.
- Cloudflare tokens.
- KV namespace values.
- Provider API keys.
- Product-specific compliance word lists unless separately supplied by the local owner.
- Product-specific claims, brand books, performance benchmarks, client materials, and market evidence.
