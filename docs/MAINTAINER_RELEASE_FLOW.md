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
4. Run:

```powershell
.\tests\validate_share_kit.ps1
.\scripts\build_release_package.ps1
```

5. Commit and push the template repository.
6. Optionally attach the generated zip to a GitHub Release.

## Downstream Steps

Downstream users update their own local factory with:

```powershell
cd <their-factory-root>
.\scripts\update_from_template.ps1 -TemplateRoot "<updated-template-repo>"
```

This preserves their product branches and local distribution governance files.

## Never Include

- private product source
- deployment credentials
- provider API keys
- worker secrets
- KV namespace data
- unapproved branch-specific optimizations

