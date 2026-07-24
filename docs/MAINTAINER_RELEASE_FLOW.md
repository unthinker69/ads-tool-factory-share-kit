# Maintainer Release Flow

This flow is for the template maintainer.

## Goal

Publish reusable factory improvements downstream without giving downstream users any path to modify the maintainer's private factory.

## Release Model

```text
private maintainer factory
  -> sanitized template repository
  -> downstream independent factories
```

Downstream users receive template updates by pulling or downloading the public repository. They do not write back to the maintainer's private workspace.

## Maintainer Steps

1. Validate changes in the private factory.
2. Decide which improvements are approved for external distribution.
3. Copy only approved, generalized content into this template repository.
4. Update `docs/FEATURE_MANIFEST.md` with stable feature IDs, tags, and touched files for any distributed capability.
5. Run:

```powershell
.\tests\validate_share_kit.ps1
.\scripts\build_release_package.ps1
```

6. Commit and push the template repository.
7. Optionally attach the generated zip to a GitHub Release.

## Downstream Steps

Downstream users update their own local factory with:

```powershell
cd <their-factory-root>
.\scripts\update_from_template.ps1 -TemplateRoot "<updated-template-repo>"
```

This preserves their product branches and local distribution governance files. If a maintainer update overlaps a downstream local edit, the update script must ask the downstream user whether to replace, skip, keep both, or run report-only mode.

Semantic overlap also matters. If the maintainer ships a feature tagged `ui-theme,color` and the downstream factory has a local feature with the same or overlapping tags in `docs/feature_registry.md`, the update is treated as a conflict even if the changed files are not identical.

## Never Include

- private product source
- deployment credentials
- provider API keys
- worker secrets
- KV namespace data
- unapproved branch-specific optimizations
