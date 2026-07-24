# Instructions For AI Coding Agents

You are working inside an Ads Tool Factory for performance marketers and growth teams. The factory helps create product-specific ad copy generation tools with reusable API, provider-pool, scoring, and release-governance standards.

## Read First

Before making changes, read:

1. `AGENTS.md`
2. `docs/BASELINE_TOOL_SPEC.md`
3. `docs/PROMOTION_PROTOCOL.md`
4. `docs/RELEASE_CHECKLIST.md`
5. `docs/PRODUCT_INTAKE_FORM.md`
6. The target product's `product.json`, `brief.md`, and `TASK.md`

## Boundaries

- Product-specific changes should stay under `products/<slug>/`.
- Branch optimizations are local by default.
- `docs/distribution_queue.md` only controls inheritance inside the current local factory. It must not be treated as permission to modify the upstream repository or another team's factory.
- Do not distribute a branch optimization inside the current local factory unless the local owner explicitly says to distribute it.
- Do not copy secrets, Cloudflare tokens, provider API keys, KV data, or private product source from another factory.
- Do not add upstream remotes, push to upstream repositories, open automated upstream PRs, or attempt to sync local changes back to the template repository unless the repository maintainer explicitly asks for release work.
- Do not invent claims for regulated categories such as finance, health, legal, or credit.
- Treat advertising claims as evidence-bound. If product facts, certification, pricing, payout, delivery time, or compliance evidence is missing, keep copy generic and mark the gap.
- At the start of every new product branch, present `docs/PRODUCT_INTAKE_FORM.md` to collect product, market, placement, audience, documentation, brand book, and UI evidence before implementation.
- Start product implementation from `templates/full-tool-source` or the `products/<slug>/source` directory created by `scripts/new_product.ps1`. Do not rebuild the GUI from scratch.
- Use the brand book, product documents, product links, screenshots, and approved examples to customize UI design, palette, default copy, scoring signals, and API examples.
- Preserve every required baseline capability listed in `docs/BASELINE_TOOL_SPEC.md`. Do not ship a simplified product page that drops account login, per-user BYOK, provider profile management, model discovery, model pool, external AI API, personal API token flow, score control, batch generation, copy/export, or persistence-safe deployment.
- Preserve the existing tool UI structure. Product work may adjust color tokens, defaults, left-top brand display, product language, examples, and product-specific options, but must not replace the tool with a landing page, simple form, or unrelated layout.

## Product Work Pattern

1. Create or inspect the product branch under `products/<slug>/`.
2. Ask for the product intake form before building.
3. Confirm that the product branch includes all required capabilities in `docs/BASELINE_TOOL_SPEC.md`.
4. Use the generated `products/<slug>/source` full-tool baseline as the implementation base.
5. Derive UI color tokens, top-left brand display, examples, and default states from the provided brand/product materials while preserving the baseline layout.
6. Build product-specific configuration, prompt rules, UI defaults, API schema, scoring guardrails, and release checks.
7. Reuse only the modules that are listed in `docs/distribution_manifest.md`.
8. Record local branch optimizations in `docs/branch_optimizations.md`.
9. If the local owner explicitly approves distribution within their own factory, add the item to `docs/distribution_queue.md`.
10. Run the release checklist and report verification.

## Marketing Quality Standard

- Use paid-media language, not generic chatbot copy.
- Keep ad assets platform-aware: concise hooks, benefit clarity, CTA discipline, byte/character constraints, and market localization.
- Preserve product truthfulness and compliance boundaries over short-term conversion wording.
- Make API documentation clear enough for external AI agents to adjust `qty`, `agent_id`, provider-pool mode, and score targets without manual explanation.
- Treat brand-derived UI customization as a required setup step, not a later polish pass.
- Treat missing baseline capabilities as release blockers unless the owner explicitly approved the exception for that product.
