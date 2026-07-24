# Baseline Tool Specification

Every product generated from this share-kit must start from the same complete advertising-tool baseline. Product customization changes product facts, default options, copy rules, scoring signals, theme colors, and the top-left brand block. It must not remove the operational capabilities below.

## Required Product Tool Capabilities

- Per-user BYOK account setup: each browser user can configure and save their own provider API keys without sharing keys globally.
- Provider profile management: users can add, edit, activate, inspect, and remove provider profiles with model name, API base URL, API key, and compatibility mode.
- Connection parsing: the model form accepts relay/newapi-style JSON connection blocks such as `{"_type":"newapi_channel_conn","key":"...","url":"https://..."}` and can extract the key and URL into the provider form.
- Model discovery: when supported by the provider endpoint, users can sniff or fetch available models and select one for a provider profile.
- Product-local model pool: users can add saved provider profiles to the active model pool, view active pool members, toggle which models are available, and remove models from the pool.
- Concurrent generation: batch generation can route work across active model-pool members instead of forcing one model for all jobs.
- Agent-sticky assignment: external AI callers can pass an `agent_id` so each agent can consistently use one assigned pool member.
- Cloud account and personal API token flow: users can create or log into their own tool account, save provider profiles and model pools to that account, and generate a personal API token for external AI calls.
- External AI API: the deployed Worker exposes machine-callable endpoints, including schema/OpenAPI discovery, generation, scoring, provider-pool status, and documented examples.
- Quantity control: API callers can request variable output quantity up to the documented maximum, currently 50 per requested type unless a product has an explicit lower compliance limit.
- Score control: generation supports minimum score targets, candidate ranking, quality goals, retry history, and dynamic retry guidance based on deterministic scoring failures.
- Scoring visibility: returned candidates expose score dimensions such as hook, relevance, CTA, space use, total score, fulfilled status, and retry metadata when score control is used.
- Batch category generation: users can select multiple categories/jobs/benefits and generate in batch across different product categories or product-use cases.
- Export and copy workflow: users can copy individual outputs, copy all outputs, export structured results, and preserve scores/metadata.
- Persistence-safe deployment: redeploying a product tool must not clear browser localStorage keys, cloud account records, provider profiles, model pools, personal API tokens, or KV-backed user data.

## Required UI Structure

Generated product tools must preserve the current tool UI structure:

- Top bar with a top-left brand block/logo area, app name, product/platform badge, key status, and key/model management entry.
- Left configuration panel with scrollable sections for market/language/device, category/job selection, benefit/function selection, output settings, score targets, and generation actions.
- Main results area with batch status, filter controls, candidate cards, score visibility, and copy/export actions.
- Key/model management surface with saved keys/profiles, add/parse provider form, cloud account/API token area, API command examples, and model-pool management.
- Responsive layout behavior and scrollability must remain intact on desktop and mobile.

## Allowed Product Customization

Product branches may customize:

- Top-left brand block text/logo mark and product display name.
- Theme tokens such as primary color, accent color, button color, surface emphasis, and status colors, using evidence from the brand book or product screenshots.
- Default countries, languages, device defaults, placements, categories/jobs, benefits/functions, tone options, scoring hints, examples, and prompt rules.
- Product-specific compliance rules and claim boundaries.
- Empty states, helper labels, and API examples so they match the product and market.

## Not Allowed Without Explicit Owner Approval

- Removing account login, BYOK, provider profile management, model discovery, model pool, API token generation, external API, score control, or batch generation.
- Replacing the two-panel/management-heavy tool interface with a landing page, hero page, simple form, or decorative marketing page.
- Moving saved provider profiles or model pools to a new storage key in a way that makes existing users lose saved configuration.
- Hardcoding a shared provider API key into the public client or Worker.
- Inventing product claims, performance claims, compliance claims, market data, or feature availability.

## Acceptance Criteria

Before delivery, the AI agent must verify:

- The generated tool still contains every required capability above, or lists a clear owner-approved exception.
- `/api/schema` and `/api/openapi.json` describe the same callable capabilities available in the web UI.
- External API calls can use saved account/model-pool records where the product supports cloud account mode.
- Score control is callable from both web UI and external API.
- UI keeps the same structural layout; only product branding, color tokens, defaults, and copy are product-calibrated.
- Redeploy does not change user storage keys or wipe saved keys, model profiles, model pools, API tokens, or KV data.
