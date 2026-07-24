# __PRODUCT_NAME__ Ads Generator Deployment

Production URL:

```text
https://__WORKER_NAME__.<your-workers-subdomain>.workers.dev/
```

## One-time Cloudflare token setup

Run this once on this Windows user:

```powershell
Set-Location -LiteralPath '<your-factory>\products\__PRODUCT_SLUG__\source'
.\scripts\save_cloudflare_token.ps1
```

The token is stored at `.secrets\cloudflare_api_token.dpapi`, encrypted with Windows DPAPI for the current Windows user only.

## Redeploy an updated HTML file

```powershell
Set-Location -LiteralPath '<your-factory>\products\__PRODUCT_SLUG__\source'
.\scripts\deploy.ps1 -SkipCopy
```

The script deploys the current `public\index.html` to the same Cloudflare Worker. If you pass `-SourceHtml`, it backs up the current deployed HTML, copies that source file to `public\index.html`, then deploys.

## Preserve users' saved API keys

User API keys are stored in each visitor's browser localStorage under:

- `rn_keys`
- `rn_active_key`
- `rn_custom_*`

Do not rename or clear these localStorage keys in future UI changes. As long as the production URL stays the same, redeploying HTML/JS will not delete existing users' saved keys.


