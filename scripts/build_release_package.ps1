param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $root "tests\validate_share_kit.ps1")

if (-not $OutputPath) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path (Split-Path -Parent $root) "ads-tool-factory-share-kit-$stamp.zip"
}

$temp = Join-Path $env:TEMP ("ads-tool-factory-share-kit-release-" + [guid]::NewGuid().ToString("N"))
New-Item -Path $temp -ItemType Directory -Force | Out-Null

$excludeDirs = @(".git", ".secrets", ".wrangler", "dist", "node_modules", "products")
Get-ChildItem -Path $root -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) { return }
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $temp $_.Name) -Recurse -Force
}

if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath -Force }
Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $OutputPath -Force
Remove-Item -LiteralPath $temp -Recurse -Force

Write-Host "Release package created: $OutputPath"

