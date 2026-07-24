# Agent Rules

This is an Ads Tool Factory template for advertising optimization workflows. Treat it as a starting point for the local team's own product-tool factory.

## Safety

1. Do not request or use credentials from an external workspace.
2. Do not modify another team's private factory.
3. Do not copy private product source from another factory.
4. Keep each deployment owner's Cloudflare account, KV namespace, API keys, provider pool, and worker secrets separate.
5. Do not invent product, compliance, pricing, certification, banking, finance, health, legal, or safety claims.

## Distribution

Branch improvements are local by default. They can be distributed only when the responsible owner explicitly says something like:

- "Distribute this optimization."
- "Let other branches inherit this."
- "Promote this to core/modules."

If not explicitly approved, keep the improvement in `products/<slug>/` and record it in `docs/branch_optimizations.md`.

## Layers

- `core/`: shared contracts and account/API standards.
- `modules/`: reusable advertising, API, scoring, and provider-pool capabilities approved for distribution.
- `products/<slug>/`: product-specific branches.
- `docs/`: distribution protocol and release checklist.
