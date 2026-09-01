param([switch]$Reconfigure)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$SecretDir = Join-Path $Root ".secrets"
$SecretPath = Join-Path $SecretDir "cloudflare_api_token.dpapi"
$AccountPath = Join-Path $SecretDir "cloudflare_account_id.txt"
$Api = "https://api.cloudflare.com/client/v4"

function Invoke-CloudflareApi {
  param([string]$Path, [string]$Token)
  try {
    return Invoke-RestMethod -Method Get -Uri ($Api + $Path) -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 45
  } catch {
    $detail = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
      try {
        $body = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($body.errors) { $detail = ($body.errors | ForEach-Object { $_.message }) -join "; " }
      } catch { }
    }
    throw $detail
  }
}

function Save-CloudflareConfig {
  param([string]$Token, [string]$AccountId)
  New-Item -ItemType Directory -Force -Path $SecretDir | Out-Null
  (ConvertTo-SecureString $Token -AsPlainText -Force | ConvertFrom-SecureString) | Set-Content -LiteralPath $SecretPath -Encoding ASCII
  Set-Content -LiteralPath $AccountPath -Value $AccountId -Encoding ASCII
}

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Cloudflare 配置向导"
$Form.Width = 760; $Form.Height = 430; $Form.StartPosition = "CenterScreen"
$Form.TopMost = $true; $Form.ShowInTaskbar = $true

$Title = New-Object System.Windows.Forms.Label
$Title.Text = "只需配置一次 Cloudflare，后面直接点部署"
$Title.Left = 24; $Title.Top = 18; $Title.Width = 690; $Title.Height = 30
$Title.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 14, [System.Drawing.FontStyle]::Bold)
$Form.Controls.Add($Title)

$Help = New-Object System.Windows.Forms.Label
$Help.Text = "操作顺序：1. 打开官方页面创建 API Token；2. 复制 Token；3. 粘贴后点击验证。`r`n不要粘贴 Global API Key。建议使用 Workers 和 KV 的最小权限 Token。"
$Help.Left = 24; $Help.Top = 58; $Help.Width = 690; $Help.Height = 52
$Help.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10)
$Form.Controls.Add($Help)

$Open = New-Object System.Windows.Forms.Button
$Open.Text = "打开 Cloudflare Token 页面"; $Open.Left = 24; $Open.Top = 122; $Open.Width = 220; $Open.Height = 34
$Open.Add_Click({ Start-Process "https://dash.cloudflare.com/profile/api-tokens" })
$Form.Controls.Add($Open)

$TokenLabel = New-Object System.Windows.Forms.Label
$TokenLabel.Text = "粘贴 API Token："; $TokenLabel.Left = 24; $TokenLabel.Top = 176; $TokenLabel.Width = 130; $TokenLabel.Height = 24
$Form.Controls.Add($TokenLabel)
$TokenBox = New-Object System.Windows.Forms.TextBox
$TokenBox.Left = 155; $TokenBox.Top = 172; $TokenBox.Width = 555; $TokenBox.Height = 28; $TokenBox.UseSystemPasswordChar = $true
$Form.Controls.Add($TokenBox)

$Status = New-Object System.Windows.Forms.Label
$Status.Text = "尚未验证"; $Status.Left = 24; $Status.Top = 215; $Status.Width = 690; $Status.Height = 32
$Status.ForeColor = [System.Drawing.Color]::DimGray; $Form.Controls.Add($Status)

$AccountLabel = New-Object System.Windows.Forms.Label
$AccountLabel.Text = "选择 Cloudflare 账号："; $AccountLabel.Left = 24; $AccountLabel.Top = 262; $AccountLabel.Width = 150; $AccountLabel.Height = 24
$Form.Controls.Add($AccountLabel)
$AccountBox = New-Object System.Windows.Forms.ComboBox
$AccountBox.Left = 175; $AccountBox.Top = 258; $AccountBox.Width = 535; $AccountBox.Height = 28
$AccountBox.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList; $Form.Controls.Add($AccountBox)

$Verify = New-Object System.Windows.Forms.Button
$Verify.Text = "验证 Token"; $Verify.Left = 24; $Verify.Top = 315; $Verify.Width = 150; $Verify.Height = 36; $Form.Controls.Add($Verify)
$Cancel = New-Object System.Windows.Forms.Button
$Cancel.Text = "取消"; $Cancel.Left = 410; $Cancel.Top = 315; $Cancel.Width = 95; $Cancel.Height = 36
$Cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel; $Form.CancelButton = $Cancel; $Form.Controls.Add($Cancel)
$Save = New-Object System.Windows.Forms.Button
$Save.Text = "保存并继续部署"; $Save.Left = 520; $Save.Top = 315; $Save.Width = 190; $Save.Height = 36; $Save.Enabled = $false
$Form.AcceptButton = $Save; $Form.Controls.Add($Save)

$script:Accounts = @(); $script:ValidatedToken = ""
$Verify.Add_Click({
  try {
    $token = $TokenBox.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($token)) { throw "请先粘贴 API Token。" }
    $verify = Invoke-CloudflareApi "/user/tokens/verify" $token
    if (-not $verify.success) { throw "Token 验证未通过，请确认 Token 没有过期。" }
    $accounts = Invoke-CloudflareApi "/accounts?per_page=100" $token
    $script:Accounts = @($accounts.result)
    if (-not $script:Accounts.Count) { throw "这个 Token 没有可用的 Cloudflare 账号。" }
    $AccountBox.Items.Clear()
    foreach ($account in $script:Accounts) { [void]$AccountBox.Items.Add("$($account.name)（$($account.id)）") }
    $AccountBox.SelectedIndex = 0
    $script:ValidatedToken = $token
    $Status.Text = "验证成功：已找到 $($script:Accounts.Count) 个账号，请确认账号后保存。"
    $Status.ForeColor = [System.Drawing.Color]::DarkGreen; $Save.Enabled = $true
  } catch {
    $Status.Text = "验证失败：$($_.Exception.Message)"; $Status.ForeColor = [System.Drawing.Color]::Firebrick; $Save.Enabled = $false
  }
})
$Save.Add_Click({
  try {
    if (-not $script:ValidatedToken -or $AccountBox.SelectedIndex -lt 0) { throw "请先验证 Token 并选择账号。" }
    Save-CloudflareConfig $script:ValidatedToken $script:Accounts[$AccountBox.SelectedIndex].id
    $Form.DialogResult = [System.Windows.Forms.DialogResult]::OK; $Form.Close()
  } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "无法保存", "OK", "Error") | Out-Null }
})
$Form.Add_Shown({ $Form.Activate(); $TokenBox.Focus() })
if ($Form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw "Cloudflare 配置已取消。" }
Write-Host "Cloudflare 配置已保存，账号选择已记录到本机。"
