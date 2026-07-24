param(
  [Parameter(Mandatory=$true)][string]$TemplateRoot
)

$ErrorActionPreference = "Stop"
$factoryRoot = Split-Path -Parent $PSScriptRoot
$templateRootResolved = (Resolve-Path -LiteralPath $TemplateRoot).Path

if (-not (Test-Path -LiteralPath (Join-Path $templateRootResolved "docs\UPSTREAM_POLICY.md"))) {
  throw "TemplateRoot does not look like an Ads Tool Factory template: $templateRootResolved"
}

$backupRoot = Join-Path $factoryRoot ("_template_update_backup_" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

$dirsToUpdate = @("core", "modules", "templates", "tests")
foreach ($dir in $dirsToUpdate) {
  $source = Join-Path $templateRootResolved $dir
  $target = Join-Path $factoryRoot $dir
  if (-not (Test-Path -LiteralPath $source)) { continue }
  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot $dir) -Recurse -Force
    Remove-Item -LiteralPath $target -Recurse -Force
  }
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}

$scriptsSource = Join-Path $templateRootResolved "scripts"
$scriptsTarget = Join-Path $factoryRoot "scripts"
New-Item -Path $scriptsTarget -ItemType Directory -Force | Out-Null
Get-ChildItem -Path $scriptsSource -File -Filter "*.ps1" | ForEach-Object {
  $target = Join-Path $scriptsTarget $_.Name
  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot ("scripts-" + $_.Name)) -Force
  }
  Copy-Item -LiteralPath $_.FullName -Destination $target -Force
}

$docsSource = Join-Path $templateRootResolved "docs"
$docsTarget = Join-Path $factoryRoot "docs"
New-Item -Path $docsTarget -ItemType Directory -Force | Out-Null
$localDocs = @("branch_optimizations.md", "distribution_queue.md")
Get-ChildItem -Path $docsSource -File | ForEach-Object {
  if ($localDocs -contains $_.Name) { return }
  $target = Join-Path $docsTarget $_.Name
  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot ("docs-" + $_.Name)) -Force
  }
  Copy-Item -LiteralPath $_.FullName -Destination $target -Force
}

$rootFiles = @("README.md", "README_FOR_ANY_AI.md", "AGENTS.md", ".gitignore")
foreach ($file in $rootFiles) {
  $source = Join-Path $templateRootResolved $file
  $target = Join-Path $factoryRoot $file
  if (-not (Test-Path -LiteralPath $source)) { continue }
  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot $file) -Force
  }
  Copy-Item -LiteralPath $source -Destination $target -Force
}

Write-Host "Template update imported into: $factoryRoot"
Write-Host "Backup saved at: $backupRoot"
Write-Host "Preserved: products, docs\\branch_optimizations.md, docs\\distribution_queue.md"
