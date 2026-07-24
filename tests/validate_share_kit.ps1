$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$required = @(
  "README.md",
  "README_FOR_ANY_AI.md",
  "AGENTS.md",
  "core\worker_contract.md",
  "docs\BASELINE_TOOL_SPEC.md",
  "modules\score-control\README.md",
  "modules\provider-pool\README.md",
  "templates\product\product.json.template",
  "templates\product\brief.md.template",
  "templates\product\TASK.md.template",
  "templates\full-tool-source\README.md",
  "templates\full-tool-source\public\index.html",
  "templates\full-tool-source\src\worker_api_template.js",
  "templates\full-tool-source\scripts\deploy.ps1",
  "templates\full-tool-source\scripts\deploy_via_api.py",
  "templates\full-tool-source\scripts\build_worker.mjs",
  "templates\full-tool-source\package.json",
  "templates\full-tool-source\wrangler.jsonc",
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
  $relative = $_.FullName.Substring($root.Length).TrimStart('\')
  $isAllowedTemplateTokenScript = $relative -in @(
    "templates\full-tool-source\scripts\prompt_save_cloudflare_token.ps1",
    "templates\full-tool-source\scripts\save_cloudflare_token.ps1"
  )
  ((-not $isAllowedTemplateTokenScript) -and $_.Name -match 'worker_app_secret|cloudflare_token|\.env|\.pem$|\.key$') -or
  $_.FullName -match '\\products\\[^\\]+\\source\\'
}
if ($forbiddenFiles) {
  throw "Forbidden files found: $($forbiddenFiles.FullName -join ', ')"
}

$baselineText = Get-Content -LiteralPath (Join-Path $root "templates\full-tool-source\README.md") -Raw -Encoding UTF8
foreach ($term in @("Per-user BYOK", "Model discovery", "model-pool", "External AI API", "Score control", "Do not replace this with a landing page")) {
  if ($baselineText -notlike "*$term*") { throw "Baseline source README missing term: $term" }
}

$baselineHtml = Get-Content -LiteralPath (Join-Path $root "templates\full-tool-source\public\index.html") -Raw -Encoding UTF8
foreach ($term in @("key-mgr-btn", "modal-pages", "api-command-box", "provider-pool", "copyProductIntakePrompt")) {
  if ($baselineHtml -notlike "*$term*") { throw "Baseline HTML missing capability marker: $term" }
}

Write-Host "Share-kit validation passed."
Write-Host "Root: $root"
