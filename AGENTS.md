# Agent Rules

This is a shared Ads Tool Factory kit. Treat it as a template for the local owner's own factory.

## Safety

1. Do not request or use the original author's secrets.
2. Do not modify the original author's private factory.
3. Do not copy private product source from another factory.
4. Keep each user's Cloudflare account, KV namespace, API keys, provider pool, and worker secrets separate.

## Distribution

Branch improvements are local by default. They can be distributed only when the local owner explicitly says something like:

- "Distribute this optimization."
- "Let other branches inherit this."
- "Promote this to core/modules."

If not explicitly approved, keep the improvement in `products/<slug>/` and record it in `docs/branch_optimizations.md`.

## Layers

- `core/`: shared contracts and account/API standards.
- `modules/`: reusable capabilities approved for distribution.
- `products/<slug>/`: product-specific branches.
- `docs/`: distribution protocol and release checklist.

