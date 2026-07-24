param(
  [string]$SourceHtml,
  [switch]$SkipCopy
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$PublicIndex = Join-Path $Root "public\index.html"
$SecretPath = Join-Path $Root ".secrets\cloudflare_api_token.dpapi"
$DeployScript = Join-Path $PSScriptRoot "deploy_via_api.py"

function Get-PlainTextFromSecureString {
  param([securestring]$SecureString)
  $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
  } finally {
    if ($Bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
    }
  }
}

if (-not (Test-Path -LiteralPath $SecretPath)) {
  Write-Host "Cloudflare token is not saved yet. A one-time encrypted save is required."
  & (Join-Path $PSScriptRoot "save_cloudflare_token.ps1")
}

if (-not $SkipCopy) {
  if ([string]::IsNullOrWhiteSpace($SourceHtml)) {
    throw "Pass -SourceHtml <path> or use -SkipCopy."
  }

  $ResolvedSource = Resolve-Path -LiteralPath $SourceHtml
  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = Join-Path (Split-Path -Parent $PublicIndex) "index.before-deploy-$Stamp.html"

  Copy-Item -LiteralPath $PublicIndex -Destination $BackupPath -Force
  Copy-Item -LiteralPath $ResolvedSource -Destination $PublicIndex -Force

  Write-Host "Copied source HTML to public index:"
  Write-Host "  Source: $ResolvedSource"
  Write-Host "  Backup: $BackupPath"
}

$Encrypted = (Get-Content -LiteralPath $SecretPath -Raw).Trim()
$SecureToken = $Encrypted | ConvertTo-SecureString
$env:CLOUDFLARE_API_TOKEN = Get-PlainTextFromSecureString $SecureToken

try {
  python $DeployScript
} finally {
  Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
}

