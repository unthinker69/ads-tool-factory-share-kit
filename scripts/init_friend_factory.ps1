param(
  [Parameter(Mandatory=$true)][string]$FactoryRoot,
  [string]$OwnerName = "local-owner"
)

$ErrorActionPreference = "Stop"
$sourceRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = $FactoryRoot

if (Test-Path -LiteralPath $targetRoot) {
  throw "Target factory already exists: $targetRoot"
}

New-Item -Path $targetRoot -ItemType Directory -Force | Out-Null
$excludeDirs = @(".git", ".secrets", ".wrangler", "dist", "node_modules", "products")

Get-ChildItem -Path $sourceRoot -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) { return }
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $targetRoot $_.Name) -Recurse -Force
}

New-Item -Path (Join-Path $targetRoot "products") -ItemType Directory -Force | Out-Null

$ownerFile = Join-Path $targetRoot "OWNER.md"
Set-Content -LiteralPath $ownerFile -Value "# Factory Owner`n`nOwner: $OwnerName`n`nThis is an independent local factory created from a share kit." -Encoding UTF8

Write-Host "Created independent factory: $targetRoot"
Write-Host "Next: cd $targetRoot"
Write-Host "Then: .\\scripts\\new_product.ps1 -Slug my-product -DisplayName 'My Product' -Industry 'general'"

