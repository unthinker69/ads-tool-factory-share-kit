# Release Checklist

Before shipping or deploying a product tool:

- [ ] Home page returns HTTP 200.
- [ ] `/api/schema` returns successfully.
- [ ] `/api/openapi.json` returns successfully.
- [ ] User BYOK remains per-user, not shared globally.
- [ ] Saved provider profiles and model pools are not lost during redeploy.
- [ ] Product model pool is product-local.
- [ ] Personal API token examples do not expose provider API keys.
- [ ] Score control runs server-side.
- [ ] `qty` limits are documented and enforced.
- [ ] `agent_id` and provider pool behavior are documented for external AI callers.
- [ ] Regulated-category claims are evidence-based.
- [ ] Browser script syntax is checked if the page uses inline scripts.
- [ ] No secrets are committed.

