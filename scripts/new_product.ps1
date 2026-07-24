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

$productDir = Join-Path $factoryRoot "products\$safeSlug"
if (Test-Path -LiteralPath $productDir) {
  throw "Product already exists: $productDir"
}

New-Item -Path $productDir -ItemType Directory -Force | Out-Null
$templateDir = Join-Path $factoryRoot "templates\product"

Get-ChildItem -Path $templateDir -Filter "*.template" | ForEach-Object {
  $targetName = $_.Name -replace '\.template$', ''
  $targetPath = Join-Path $productDir $targetName
  $content = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  $content = $content.Replace("{{slug}}", $safeSlug).Replace("{{display_name}}", $DisplayName).Replace("{{industry}}", $Industry).Replace("{{based_on}}", $BasedOn).Replace("{{factory_root}}", $factoryRoot)
  Set-Content -LiteralPath $targetPath -Value $content -Encoding UTF8
}

Write-Host "Created product branch: $productDir"
Write-Host "Send this task file to your AI agent: $productDir\TASK.md"

