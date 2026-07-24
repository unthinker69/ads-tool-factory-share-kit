# Full Tool Source Template

This directory is the complete baseline implementation that every generated product branch should start from.

It is intentionally more than a UI mockup. It includes:

- Browser UI with the established tool layout and visual structure.
- Per-user BYOK provider profile management.
- Relay/newapi JSON connection parsing.
- Model discovery where the provider endpoint supports it.
- Product-local model pool controls.
- Cloud account and personal API token flow.
- External AI API command panel.
- Worker API template with schema/OpenAPI, generation, scoring, translation, provider-pool status, model listing, and API-token endpoints.
- Score control, quality goals, retry guidance, and score metadata.
- Batch generation, copy/export actions, and deployment scripts.

## Product Customization Rule

When adapting this source for a product, preserve the GUI structure and all baseline capabilities.

Allowed product changes:

- `__PRODUCT_NAME__`, `__PRODUCT_SLUG__`, `__BRAND_MARK__`, `__WORKER_NAME__`, and `__KV_TITLE__` replacements.
- Top-left brand block, product display name, badge text, and theme colors.
- Default country, language, platform, categories/jobs, benefits/functions, tone, examples, and empty states.
- Prompt rules, product facts, compliance limits, scoring dictionaries, and API examples.

Do not replace this with a landing page, a simple form, or a newly invented interface. Keep the existing top bar, left configuration panel, right results area, Key/model management surface, model-pool controls, external API area, and scored result cards.

## Deployment Safety

Do not commit generated `.secrets`, `.wrangler`, `dist`, `node_modules`, provider API keys, Cloudflare tokens, Worker app secrets, or KV data.

Redeploys must preserve stable storage keys and product-local provider-pool keys unless the product owner explicitly approves a migration plan.
