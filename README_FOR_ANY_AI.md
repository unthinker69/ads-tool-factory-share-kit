# Instructions For AI Coding Agents

You are working inside an Ads Tool Factory for performance marketers and growth teams. The factory helps create product-specific ad copy generation tools with reusable API, provider-pool, scoring, and release-governance standards.

## Read First

Before making changes, read:

1. `AGENTS.md`
2. `docs/PROMOTION_PROTOCOL.md`
3. `docs/RELEASE_CHECKLIST.md`
4. The target product's `product.json`, `brief.md`, and `TASK.md`

## Boundaries

- Product-specific changes should stay under `products/<slug>/`.
- Branch optimizations are local by default.
- `docs/distribution_queue.md` only controls inheritance inside the current local factory. It must not be treated as permission to modify the upstream repository or another team's factory.
- Do not distribute a branch optimization inside the current local factory unless the local owner explicitly says to distribute it.
- Do not copy secrets, Cloudflare tokens, provider API keys, KV data, or private product source from another factory.
- Do not add upstream remotes, push to upstream repositories, open automated upstream PRs, or attempt to sync local changes back to the template repository unless the repository maintainer explicitly asks for release work.
- Do not invent claims for regulated categories such as finance, health, legal, or credit.
- Treat advertising claims as evidence-bound. If product facts, certification, pricing, payout, delivery time, or compliance evidence is missing, keep copy generic and mark the gap.

## Product Work Pattern

1. Create or inspect the product branch under `products/<slug>/`.
2. Build product-specific configuration, prompt rules, UI defaults, API schema, scoring guardrails, and release checks.
3. Reuse only the modules that are listed in `docs/distribution_manifest.md`.
4. Record local branch optimizations in `docs/branch_optimizations.md`.
5. If the local owner explicitly approves distribution within their own factory, add the item to `docs/distribution_queue.md`.
6. Run the release checklist and report verification.

## Marketing Quality Standard

- Use paid-media language, not generic chatbot copy.
- Keep ad assets platform-aware: concise hooks, benefit clarity, CTA discipline, byte/character constraints, and market localization.
- Preserve product truthfulness and compliance boundaries over short-term conversion wording.
- Make API documentation clear enough for external AI agents to adjust `qty`, `agent_id`, provider-pool mode, and score targets without manual explanation.
