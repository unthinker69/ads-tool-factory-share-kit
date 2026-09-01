# __PRODUCT_NAME__ Ads Generator Deployment

生产地址：

```text
https://__WORKER_NAME__.<your-workers-subdomain>.workers.dev/
```

## 一次性 Cloudflare 配置

双击运行部署脚本即可出现中文配置向导。向导会打开官方 Token 页面，用户只需要复制一次 Token 并粘贴到向导中；工具会先验证 Token、列出可用账号，确认后自动保存账号选择。

```powershell
Set-Location -LiteralPath '<your-factory>\products\__PRODUCT_SLUG__\source'
.\scripts\deploy.ps1 -SkipCopy
```

Token 保存在 `.secrets\cloudflare_api_token.dpapi`，仅当前 Windows 用户可以解密；账号 ID 保存在 `.secrets\cloudflare_account_id.txt`，不会上传到 GitHub。

如果需要更换 Token 或账号，运行：

```powershell
.\scripts\deploy.ps1 -SkipCopy -Reconfigure
```

## 重新部署 HTML

```powershell
.\scripts\deploy.ps1 -SkipCopy
```

脚本会把当前 `public\index.html` 部署到同一个 Cloudflare Worker。如果传入 `-SourceHtml`，会先备份当前文件，再复制指定 HTML 并部署。

## 保留用户已保存的 API Key

用户 API Key 保存在浏览器 localStorage：

- `rn_keys`
- `rn_active_key`
- `rn_custom_*`

不要在后续 UI 更新中重命名或清空这些 localStorage key。只要生产地址不变，重新部署不会删除用户已经保存的 Key。
