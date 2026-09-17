param(
  [Parameter(Mandatory=$true)][string]$Slug,
  [Parameter(Mandatory=$true)][string]$DisplayName,
  [string]$Industry = "general",
  [string]$BasedOn = "share-kit"
)

$ErrorActionPreference = "Stop"
$factoryRoot = Split-Path -Parent $PSScriptRoot
$safeSlug = ($Slug.Trim().ToLower() -replace '[^a-z0-9_-]', '-').Trim('-')
if (-not $safeSlug) { throw "Slug is empty after normalization." }

$factoryConfigPath = Join-Path $factoryRoot "factory_config.json"
if (-not (Test-Path -LiteralPath $factoryConfigPath)) {
  throw "Missing factory_config.json. Initialize this factory with scripts\init_factory.ps1 first."
}
$factoryConfig = Get-Content -LiteralPath $factoryConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$kvTitle = [string]$factoryConfig.shared_account_kv_title
$sharedSecretFile = [string]$factoryConfig.shared_app_secret_file
if ([string]::IsNullOrWhiteSpace($kvTitle) -or [string]::IsNullOrWhiteSpace($sharedSecretFile)) {
  throw "factory_config.json must define shared_account_kv_title and shared_app_secret_file."
}
$sharedSecretFile = [IO.Path]::GetFullPath((Join-Path $factoryRoot $sharedSecretFile))

$productDir = Join-Path $factoryRoot "products\$safeSlug"
if (Test-Path -LiteralPath $productDir) {
  throw "Product already exists: $productDir"
}

New-Item -Path $productDir -ItemType Directory -Force | Out-Null
$templateDir = Join-Path $factoryRoot "templates\product"
$sourceTemplateDir = Join-Path $factoryRoot "templates\full-tool-source"

Get-ChildItem -Path $templateDir -Filter "*.template" | ForEach-Object {
  $targetName = $_.Name -replace '\.template$', ''
  $targetPath = Join-Path $productDir $targetName
  $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  $content = $content.Replace("{{slug}}", $safeSlug).Replace("{{display_name}}", $DisplayName).Replace("{{industry}}", $Industry).Replace("{{based_on}}", $BasedOn).Replace("{{factory_root}}", $factoryRoot).Replace("{{shared_kv_title}}", $kvTitle)
  Set-Content -LiteralPath $targetPath -Value $content -Encoding UTF8
}

if (-not (Test-Path -LiteralPath $sourceTemplateDir)) {
  throw "Missing full tool source template: $sourceTemplateDir"
}

$sourceDir = Join-Path $productDir "source"
Copy-Item -LiteralPath $sourceTemplateDir -Destination $sourceDir -Recurse -Force

$workerName = "$safeSlug-ads-generator"
$brandWords = $DisplayName -split '\s+' | Where-Object { $_ }
if ($brandWords.Count -ge 2) {
  $brandMark = (($brandWords | Select-Object -First 2) -join '<br>')
} else {
  $brandMark = $DisplayName
}

Get-ChildItem -Path $sourceDir -Recurse -File | ForEach-Object {
  $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  $content = $content.Replace("__PRODUCT_SLUG__", $safeSlug)
  $content = $content.Replace("__PRODUCT_NAME__", $DisplayName)
  $content = $content.Replace("__BRAND_MARK__", $brandMark)
  $content = $content.Replace("__WORKER_NAME__", $workerName)
  $content = $content.Replace("__KV_TITLE__", $kvTitle)
  $content = $content.Replace("__SHARED_APP_SECRET_FILE__", $sharedSecretFile)
  Set-Content -LiteralPath $_.FullName -Value $content -Encoding UTF8
}

Write-Host "Created product branch: $productDir"
Write-Host "Created full baseline source: $sourceDir"
Write-Host "Use this task file with your AI coding agent: $productDir\TASK.md"
Write-Host "Implementation base: customize $sourceDir; do not rebuild the GUI from scratch."
Write-Host "First step for the AI agent: read docs\BASELINE_TOOL_SPEC.md, then present docs\PRODUCT_INTAKE_FORM.md and collect product/brand materials before implementation."
Write-Host "Baseline rule: keep account, BYOK, provider profiles, model pool, external API, score control, batch generation, export workflow, and the existing tool UI structure."
