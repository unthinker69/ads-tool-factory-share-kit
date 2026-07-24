# Release Checklist

Before shipping or deploying a product tool:

- [ ] `docs/BASELINE_TOOL_SPEC.md` has been checked against the product implementation.
- [ ] Product tool is not a simplified landing page or single-form page.
- [ ] Existing UI structure is preserved: top bar, left configuration panel, right results area, Key/model management, model-pool controls, API call area, and scored result cards.
- [ ] Product-specific UI changes are limited to brand display, color tokens, defaults, labels, examples, and product-specific options unless the owner explicitly approved a larger UI change.
- [ ] Home page returns HTTP 200.
- [ ] `/api/schema` returns successfully.
- [ ] `/api/openapi.json` returns successfully.
- [ ] Account login or personal tool account flow works if the product supports cloud profiles.
- [ ] User BYOK remains per-user, not shared globally.
- [ ] Provider profile management supports model name, API base URL, API key, compatibility mode, and relay/newapi JSON connection parsing.
- [ ] Model discovery/sniffing is available where the provider endpoint supports it.
- [ ] Saved provider profiles and model pools are not lost during redeploy.
- [ ] Product model pool is product-local.
- [ ] Model-pool UI supports add, view active members, toggle availability, and remove from pool.
- [ ] Concurrent generation can route work across active model-pool members.
- [ ] Personal API token examples do not expose provider API keys.
- [ ] External API supports generation, scoring, schema/OpenAPI discovery, provider-pool status, `qty`, `agent_id`, and score targets.
- [ ] Score control runs server-side.
- [ ] Score control is available from both web UI and external API.
- [ ] `qty` limits are documented and enforced.
- [ ] `agent_id` and provider pool behavior are documented for external AI callers.
- [ ] Batch generation supports multiple categories/jobs/benefits.
- [ ] Copy/export workflow preserves text and score metadata.
- [ ] Regulated-category claims are evidence-based.
- [ ] Browser script syntax is checked if the page uses inline scripts.
- [ ] No secrets are committed.
