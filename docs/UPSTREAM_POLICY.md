# Upstream Policy

This repository is a one-way template distribution channel.

## What Users Can Do

- Clone or download this repository.
- Initialize an independent local factory with `scripts/init_factory.ps1`.
- Create product branches inside their own factory.
- Record branch-local optimizations in their own `docs/branch_optimizations.md`.
- Approve reuse across their own product portfolio by writing to their own `docs/distribution_queue.md`.
- Fork the repository for their own organization if they want to maintain an independent variant.

## What This Repository Does Not Do

- It does not connect to a private upstream factory.
- It does not contain a sync-back script.
- It does not push local changes to the template maintainer.
- It does not grant write access to any other factory.
- It does not share deployment credentials, provider keys, KV data, or product source.

## Upstream Updates

Upstream releases are controlled by the repository maintainer. Downstream users should treat this repository as a read-only template source unless they are explicitly doing maintainer-approved release work.

Local `distribution_queue.md` entries are local governance records only. They do not authorize upstream changes.

## Downstream Update Flow

When the maintainer publishes a new version, downstream users may import the update into their own factory. The import flow is one-way:

```text
maintainer factory -> template repository -> downstream local factory
```

The reverse direction is not part of this kit.

Downstream update scripts must preserve:

- `products/`
- `docs/branch_optimizations.md`
- `docs/distribution_queue.md`
- local deployment configuration
- local credentials and runtime state

If a template update overlaps a downstream file that may have local edits, the update flow must not silently overwrite it. It must support at least these choices:

- replace with the template version
- skip and keep the local version
- keep both versions for manual review
- report only without changing files

Overlap is not limited to identical file paths. Template releases list reusable features in `docs/FEATURE_MANIFEST.md`; downstream teams can record their own local capabilities in `docs/feature_registry.md`. If feature IDs or tags overlap, the update flow treats it as a semantic conflict even when the affected files are different.
