# Selective Distribution Protocol

Branch optimizations are local by default.

## Local First

When a product branch improves something, record it in:

```text
docs/branch_optimizations.md
```

This record does not allow other branches to inherit it.

## Explicit Distribution Only

Only when the responsible owner explicitly asks to distribute an optimization may it be added to:

```text
docs/distribution_queue.md
```

Examples of explicit approval:

- "Distribute this optimization."
- "Let other branches inherit this."
- "Promote this to core."
- "Promote this to modules."

## Where To Promote

- `core/`: account, BYOK, provider pool contract, API schema, OpenAPI, deployment standards, release governance.
- `modules/`: score control, platform copy strategy, industry strategy, localization, translation, batch generation.
- `products/<slug>/`: brand, claims, countries, language, tone, compliance wording, product-specific scoring, customer evidence.

## Required Record

```text
## <id> <date> <title>

- Source product:
- Change:
- Default state: local_only
- May other branches inherit it: no
- Risk:
- Verification:
```

For approved distribution:

```text
## <id> <date> <title>

- Source product:
- Distribution target: core / modules
- Destination:
- User approval:
- Risk:
- Verification required:
- Status: approved_for_distribution
```
