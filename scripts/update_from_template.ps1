param(
  [Parameter(Mandatory=$true)][string]$TemplateRoot,
  [ValidateSet("prompt", "report", "skip", "replace", "keep-both")][string]$Mode = "prompt"
)

$ErrorActionPreference = "Stop"
$factoryRoot = Split-Path -Parent $PSScriptRoot
$templateRootResolved = (Resolve-Path -LiteralPath $TemplateRoot).Path

if (-not (Test-Path -LiteralPath (Join-Path $templateRootResolved "docs\UPSTREAM_POLICY.md"))) {
  throw "TemplateRoot does not look like an Ads Tool Factory template: $templateRootResolved"
}

function Get-HashText([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Ensure-ParentDir([string]$Path) {
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -Path $parent -ItemType Directory -Force | Out-Null
  }
}

function Copy-WithBackup([string]$Source, [string]$Target, [string]$BackupRoot, [string]$RelativePath) {
  Ensure-ParentDir $Target
  if (Test-Path -LiteralPath $Target) {
    $backupPath = Join-Path $BackupRoot $RelativePath
    Ensure-ParentDir $backupPath
    Copy-Item -LiteralPath $Target -Destination $backupPath -Force
  }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
}

function New-CandidatePath([string]$Target) {
  $dir = Split-Path -Parent $Target
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Target)
  $ext = [System.IO.Path]::GetExtension($Target)
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  return Join-Path $dir "$name.template-$stamp$ext"
}

function Read-FeatureManifest([string]$Path) {
  $features = @()
  if (-not (Test-Path -LiteralPath $Path)) { return $features }
  $current = $null
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    if ($line -match '^##\s+(.+)$') {
      if ($current) { $features += [pscustomobject]$current }
      $current = @{ id = $Matches[1].Trim(); title = ""; tags = @(); files = @() }
      continue
    }
    if (-not $current) { continue }
    if ($line -match '^\-\s*title:\s*(.+)$') { $current.title = $Matches[1].Trim(); continue }
    if ($line -match '^\-\s*tags:\s*(.+)$') {
      $current.tags = $Matches[1].Split(",") | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ }
      continue
    }
    if ($line -match '^\-\s*files:\s*(.+)$') {
      $current.files = $Matches[1].Split(",") | ForEach-Object { $_.Trim().Trim('"') } | Where-Object { $_ }
      continue
    }
  }
  if ($current) { $features += [pscustomobject]$current }
  return $features
}

function Get-FeatureOverlap($TemplateFeature, $LocalFeatures) {
  foreach ($local in $LocalFeatures) {
    if ($TemplateFeature.id -and $local.id -and $TemplateFeature.id.ToLower() -eq $local.id.ToLower()) {
      return "same feature id: $($TemplateFeature.id)"
    }
    $overlapTags = @($TemplateFeature.tags | Where-Object { $local.tags -contains $_ })
    if ($overlapTags.Count -gt 0) {
      return "overlapping feature tags: $($overlapTags -join ', ')"
    }
  }
  return ""
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $factoryRoot ("_template_update_backup_" + $timestamp)
$reportPath = Join-Path $factoryRoot ("_template_update_report_" + $timestamp + ".md")
New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null

$preserveExact = @(
  "docs\branch_optimizations.md",
  "docs\distribution_queue.md",
  "docs\feature_registry.md"
)

$preserveRoots = @(
  "products",
  ".git",
  ".secrets",
  ".wrangler",
  "dist",
  "node_modules"
)

$updateRoots = @("core", "modules", "templates", "tests", "scripts", "docs")
$rootFiles = @("README.md", "README_FOR_ANY_AI.md", "AGENTS.md", ".gitignore")
$files = @()

$templateFeatures = Read-FeatureManifest (Join-Path $templateRootResolved "docs\FEATURE_MANIFEST.md")
$localFeatures = Read-FeatureManifest (Join-Path $factoryRoot "docs\feature_registry.md")
$semanticConflictsByPath = @{}

foreach ($feature in $templateFeatures) {
  $reason = Get-FeatureOverlap $feature $localFeatures
  if (-not $reason) { continue }
  foreach ($relativeFile in $feature.files) {
    if (-not $relativeFile) { continue }
    $semanticConflictsByPath[$relativeFile] = "feature overlap for $($feature.id): $reason"
  }
}

foreach ($rootName in $updateRoots) {
  $sourceRoot = Join-Path $templateRootResolved $rootName
  if (-not (Test-Path -LiteralPath $sourceRoot)) { continue }
  Get-ChildItem -Path $sourceRoot -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($templateRootResolved.Length).TrimStart("\", "/")
    if ($preserveExact -contains $relative) { return }
    $files += [pscustomobject]@{ Source = $_.FullName; Relative = $relative }
  }
}

foreach ($file in $rootFiles) {
  $source = Join-Path $templateRootResolved $file
  if (Test-Path -LiteralPath $source) {
    $files += [pscustomobject]@{ Source = $source; Relative = $file }
  }
}

$report = @()
$report += "# Template Update Report"
$report += ""
$report += "- Factory: $factoryRoot"
$report += "- Template: $templateRootResolved"
$report += "- Mode: $Mode"
$report += "- Time: $timestamp"
$report += ""
$report += "## Preserved"
$preserveRoots | ForEach-Object { $report += "- $_/" }
$preserveExact | ForEach-Object { $report += "- $_" }
$report += ""
if ($semanticConflictsByPath.Count -gt 0) {
  $report += "## Semantic Overlap Detection"
  foreach ($entry in $semanticConflictsByPath.GetEnumerator() | Sort-Object Name) {
    $report += "- $($entry.Key): $($entry.Value)"
  }
  $report += ""
}
$report += "## Results"

$applied = 0
$skipped = 0
$conflicts = 0
$keptBoth = 0

foreach ($item in $files | Sort-Object Relative -Unique) {
  $target = Join-Path $factoryRoot $item.Relative
  $sourceHash = Get-HashText $item.Source
  $targetHash = Get-HashText $target
  $semanticReason = $semanticConflictsByPath[$item.Relative]

  if (-not (Test-Path -LiteralPath $target) -and -not $semanticReason) {
    if ($Mode -eq "report") {
      $report += "- ADD pending: $($item.Relative)"
      continue
    }
    Copy-WithBackup $item.Source $target $backupRoot $item.Relative
    $applied++
    $report += "- ADD applied: $($item.Relative)"
    continue
  }

  if ($sourceHash -eq $targetHash -and -not $semanticReason) {
    $skipped++
    $report += "- UNCHANGED: $($item.Relative)"
    continue
  }

  $conflicts++
  $action = $Mode
  if ($Mode -eq "prompt") {
    Write-Host ""
    if ($semanticReason) {
      Write-Host "Template update may overlap a local feature: $($item.Relative)"
      Write-Host "Reason: $semanticReason"
    } else {
      Write-Host "Template update overlaps local file: $($item.Relative)"
    }
    Write-Host "Choose: [R]eplace local, [S]kip, [K]eep both as .template file, [A]bort"
    $choice = Read-Host "Action"
    switch -Regex ($choice) {
      "^[Rr]" { $action = "replace" }
      "^[Kk]" { $action = "keep-both" }
      "^[Aa]" { throw "Aborted by user at $($item.Relative)" }
      default { $action = "skip" }
    }
  }

  if ($action -eq "report") {
    if ($semanticReason) {
      $report += "- SEMANTIC CONFLICT pending: $($item.Relative) ($semanticReason)"
    } else {
      $report += "- CONFLICT pending: $($item.Relative)"
    }
    continue
  }

  if ($action -eq "replace") {
    Copy-WithBackup $item.Source $target $backupRoot $item.Relative
    $applied++
    if ($semanticReason) {
      $report += "- SEMANTIC CONFLICT replaced/added template: $($item.Relative) ($semanticReason)"
    } else {
      $report += "- CONFLICT replaced local with template: $($item.Relative)"
    }
    continue
  }

  if ($action -eq "keep-both") {
    $candidate = New-CandidatePath $target
    Copy-Item -LiteralPath $item.Source -Destination $candidate -Force
    $keptBoth++
    if ($semanticReason) {
      $report += "- SEMANTIC CONFLICT kept both: $($item.Relative) -> $([System.IO.Path]::GetFileName($candidate)) ($semanticReason)"
    } else {
      $report += "- CONFLICT kept both: $($item.Relative) -> $([System.IO.Path]::GetFileName($candidate))"
    }
    continue
  }

  $skipped++
  if ($semanticReason) {
    $report += "- SEMANTIC CONFLICT skipped template: $($item.Relative) ($semanticReason)"
  } else {
    $report += "- CONFLICT skipped local: $($item.Relative)"
  }
}

$report += ""
$report += "## Summary"
$report += ""
$report += "- Applied: $applied"
$report += "- Skipped/unchanged: $skipped"
$report += "- Conflicts or overlaps: $conflicts"
$report += "- Kept-both candidates: $keptBoth"
$report += "- Backup: $backupRoot"

Set-Content -LiteralPath $reportPath -Value ($report -join [Environment]::NewLine) -Encoding UTF8

Write-Host "Template update finished."
Write-Host "Report: $reportPath"
Write-Host "Backup: $backupRoot"
Write-Host "Applied: $applied"
Write-Host "Skipped/unchanged: $skipped"
Write-Host "Conflicts or overlaps: $conflicts"
Write-Host "Kept-both candidates: $keptBoth"
