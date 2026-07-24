# Instructions For Any AI Agent

You are working inside an Ads Tool Factory created from a share kit.

## Read First

Before making changes, read:

1. `AGENTS.md`
2. `docs/PROMOTION_PROTOCOL.md`
3. `docs/RELEASE_CHECKLIST.md`
4. The target product's `product.json`, `brief.md`, and `TASK.md`

## Boundaries

- Product-specific changes should stay under `products/<slug>/`.
- Branch optimizations are local by default.
- Do not distribute a branch optimization unless the user explicitly says to distribute it.
- Do not copy secrets, Cloudflare tokens, provider API keys, KV data, or private product source from another factory.
- Do not invent claims for regulated categories such as finance, health, legal, or credit.

## Product Work Pattern

1. Create or inspect the product branch under `products/<slug>/`.
2. Build the product-specific configuration and UI/API behavior.
3. Reuse only the modules that are listed in `docs/distribution_manifest.md`.
4. Record local branch optimizations in `docs/branch_optimizations.md`.
5. If the user explicitly approves distribution, add the item to `docs/distribution_queue.md`.
6. Run the release checklist and report verification.

