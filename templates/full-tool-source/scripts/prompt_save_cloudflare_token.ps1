$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$SecretDir = Join-Path $Root ".secrets"
$SecretPath = Join-Path $SecretDir "cloudflare_api_token.dpapi"

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Cloudflare API Token"
$Form.Width = 620
$Form.Height = 180
$Form.StartPosition = "CenterScreen"
$Form.TopMost = $true
$Form.ShowInTaskbar = $true

$Label = New-Object System.Windows.Forms.Label
$Label.Text = "Paste your Cloudflare API token. It will be encrypted for this Windows user only."
$Label.Left = 16
$Label.Top = 18
$Label.Width = 570
$Label.Height = 24
$Form.Controls.Add($Label)

$TextBox = New-Object System.Windows.Forms.TextBox
$TextBox.Left = 16
$TextBox.Top = 52
$TextBox.Width = 570
$TextBox.Height = 24
$TextBox.UseSystemPasswordChar = $true
$Form.Controls.Add($TextBox)

$Save = New-Object System.Windows.Forms.Button
$Save.Text = "Save"
$Save.Left = 402
$Save.Top = 92
$Save.Width = 88
$Save.Height = 30
$Save.DialogResult = [System.Windows.Forms.DialogResult]::OK
$Form.AcceptButton = $Save
$Form.Controls.Add($Save)

$Cancel = New-Object System.Windows.Forms.Button
$Cancel.Text = "Cancel"
$Cancel.Left = 498
$Cancel.Top = 92
$Cancel.Width = 88
$Cancel.Height = 30
$Cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$Form.CancelButton = $Cancel
$Form.Controls.Add($Cancel)

$Form.Add_Shown({ $Form.Activate(); $TextBox.Focus() })
$Result = $Form.ShowDialog()

if ($Result -ne [System.Windows.Forms.DialogResult]::OK) {
  throw "Token save cancelled."
}

$Token = $TextBox.Text.Trim()
if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "No Cloudflare API token was provided."
}

New-Item -ItemType Directory -Force -Path $SecretDir | Out-Null
$Secure = ConvertTo-SecureString $Token -AsPlainText -Force
$Secure | ConvertFrom-SecureString | Set-Content -LiteralPath $SecretPath -Encoding ASCII

Write-Host "Saved encrypted token to $SecretPath"

