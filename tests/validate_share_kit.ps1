$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$required = @(
  "README.md",
  "README_FOR_ANY_AI.md",
  "AGENTS.md",
  "core\worker_contract.md",
  "modules\score-control\README.md",
  "modules\provider-pool\README.md",
  "templates\product\product.json.template",
  "templates\product\brief.md.template",
  "templates\product\TASK.md.template",
  "docs\distribution_manifest.md",
  "docs\FEATURE_MANIFEST.md",
  "docs\feature_registry.md",
  "docs\PRODUCT_INTAKE_FORM.md",
  "docs\UPSTREAM_POLICY.md",
  "docs\MAINTAINER_RELEASE_FLOW.md",
  "docs\PROMOTION_PROTOCOL.md",
  "docs\RELEASE_CHECKLIST.md",
  "scripts\init_factory.ps1",
  "scripts\new_product.ps1",
  "scripts\build_release_package.ps1",
  "scripts\update_from_template.ps1"
)

$missing = @()
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $path))) { $missing += $path }
}
if ($missing.Count) { throw "Missing required files: $($missing -join ', ')" }

$forbiddenDirs = @(".secrets", ".wrangler", "node_modules")
foreach ($name in $forbiddenDirs) {
  $hits = Get-ChildItem -Path $root -Force -Recurse -Directory | Where-Object { $_.Name -eq $name }
  if ($hits) { throw "Forbidden directory found: $($hits.FullName -join ', ')" }
}

$forbiddenFiles = Get-ChildItem -Path $root -Force -Recurse -File | Where-Object {
  $_.Name -match 'worker_app_secret|cloudflare_token|\.env|\.pem$|\.key$' -or
  $_.FullName -match '\\products\\[^\\]+\\source\\'
}
if ($forbiddenFiles) {
  throw "Forbidden files found: $($forbiddenFiles.FullName -join ', ')"
}

Write-Host "Share-kit validation passed."
Write-Host "Root: $root"
