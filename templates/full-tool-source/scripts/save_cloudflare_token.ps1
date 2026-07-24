param(
  [string]$Token
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SecretDir = Join-Path $Root ".secrets"
$SecretPath = Join-Path $SecretDir "cloudflare_api_token.dpapi"

New-Item -ItemType Directory -Force -Path $SecretDir | Out-Null

if ([string]::IsNullOrWhiteSpace($Token)) {
  Add-Type -AssemblyName Microsoft.VisualBasic
  $Token = [Microsoft.VisualBasic.Interaction]::InputBox(
    "Paste your Cloudflare API token. It will be encrypted for this Windows user only.",
    "Save Cloudflare API Token",
    ""
  )
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "No Cloudflare API token was provided."
}

$Secure = ConvertTo-SecureString $Token.Trim() -AsPlainText -Force
$Secure | ConvertFrom-SecureString | Set-Content -LiteralPath $SecretPath -Encoding ASCII

Write-Host "Saved encrypted token to $SecretPath"
Write-Host "Only the current Windows user on this machine can decrypt it."

