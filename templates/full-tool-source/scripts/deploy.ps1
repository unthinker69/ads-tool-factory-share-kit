param(
  [string]$SourceHtml,
  [switch]$SkipCopy,
  [switch]$Reconfigure
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PublicIndex = Join-Path $Root "public\index.html"
$SecretPath = Join-Path $Root ".secrets\cloudflare_api_token.dpapi"
$DeployScript = Join-Path $PSScriptRoot "deploy_via_api.py"

function Get-PlainTextFromSecureString {
  param([securestring]$SecureString)
  $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
  finally { if ($Bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) } }
}

if ($Reconfigure -or -not (Test-Path -LiteralPath $SecretPath)) {
  & (Join-Path $PSScriptRoot "setup_cloudflare.ps1")
}

if (-not $SkipCopy) {
  if ([string]::IsNullOrWhiteSpace($SourceHtml)) { throw "请传入 -SourceHtml <文件路径>，或使用 -SkipCopy。" }
  $ResolvedSource = Resolve-Path -LiteralPath $SourceHtml
  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = Join-Path (Split-Path -Parent $PublicIndex) "index.before-deploy-$Stamp.html"
  Copy-Item -LiteralPath $PublicIndex -Destination $BackupPath -Force
  Copy-Item -LiteralPath $ResolvedSource -Destination $PublicIndex -Force
  Write-Host "已复制 HTML 并备份原文件：$BackupPath"
}

$Encrypted = (Get-Content -LiteralPath $SecretPath -Raw).Trim()
$SecureToken = $Encrypted | ConvertTo-SecureString
$env:CLOUDFLARE_API_TOKEN = Get-PlainTextFromSecureString $SecureToken
try { python $DeployScript }
finally { Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue }
