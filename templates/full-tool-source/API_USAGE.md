# __PRODUCT_NAME__ Ads Generator API

Base URL:

```text
https://__WORKER_NAME__.<your-workers-subdomain>.workers.dev
```

Machine-readable schema:

```text
GET /api/openapi.json
```

Simple capability summary:

```text
GET /api/schema
```

## Auth modes

### Mode A: Pass provider key on every request

Use this when the caller is allowed to know the DeepSeek/OpenAI-compatible/Anthropic key.

```http
POST /api/ad-copy
x-provider-api-key: <YOUR_PROVIDER_API_KEY>
Content-Type: application/json
```

```json
{
  "provider": {
    "mode": "openai",
    "base_url": "https://api.deepseek.com",
    "model": "deepseek-chat"
  },
  "categories": ["Lifestyle", "Beauty & Skincare", "Travel"],
  "regions": ["US", "AU"],
  "language": "en",
  "device": "both",
  "benefits": ["Authentic user content", "Hidden gems and local tips"],
  "type": "both",
  "tone": "casual and exciting",
  "qty": 5,
  "score_control": {
    "enabled": true,
    "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
    "max_attempts": 3,
    "return_rejected": false
  }
}
```

### Mode B: Reuse cloud-saved model profiles

This is the recommended mode for other AI tools. The external AI only receives your `rn_pat_...` personal API token, not the real provider key.

Create/login account:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "yourname",
  "password": "at-least-8-characters"
}
```

Save a model profile:

```http
POST /api/profiles
Authorization: Bearer <SESSION_TOKEN_FROM_LOGIN>
Content-Type: application/json
```

```json
{
  "name": "DeepSeek",
  "mode": "openai",
  "base_url": "https://api.deepseek.com",
  "model": "deepseek-chat",
  "api_key": "sk-...",
  "set_active": true
}
```

Create a personal API token for external AI tools:

```http
POST /api/auth/token
Authorization: Bearer <SESSION_TOKEN_FROM_LOGIN>
Content-Type: application/json
```

Then external AI tools call APIs like this:

```http
POST /api/ad-copy
Authorization: Bearer <REAL_RN_PAT_TOKEN>
Content-Type: application/json
```

```json
{
  "provider": { "profile_names": ["DeepSeek 1", "DeepSeek 2"] },
  "categories": ["Lifestyle", "Beauty & Skincare", "Travel"],
  "regions": ["US", "AU"],
  "language": "en",
  "device": "both",
  "benefits": ["Authentic user content", "Hidden gems and local tips"],
  "type": "both",
  "tone": "casual and exciting",
  "qty": 5,
  "score_control": {
    "enabled": true,
    "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
    "max_attempts": 3
  }
}
```

Do not send the literal placeholder `rn_pat_xxx`. Replace it with the real token created by the web UI or `POST /api/auth/token`.



## Saved concurrent provider pool

The web UI can save a default concurrent provider pool under the cloud account. External AI tools can then call `/api/ad-copy` with only `Authorization: Bearer rn_pat_...`; if no explicit `provider.profile_names`, `provider.profile_ids`, `provider.use_all_profiles`, or `providers` array is supplied, the API uses the saved pool automatically.

Read current saved pool:

```http
GET /api/provider-pool
Authorization: Bearer <REAL_RN_PAT_TOKEN>
```

Save by profile IDs:

```http
POST /api/provider-pool
Authorization: Bearer <SESSION_OR_RN_PAT_TOKEN>
Content-Type: application/json
```

```json
{
  "profile_ids": ["prof_xxx", "prof_yyy"]
}
```

Save by profile names:

```json
{
  "profile_names": ["DeepSeek 1", "DeepSeek 2"]
}
```

Use all saved cloud profiles:

```json
{
  "use_all_profiles": true
}
```

Clear the saved pool:

```json
{
  "profile_ids": []
}
```

Default API call using the saved pool:

```json
{
  "categories": ["Travel"],
  "type": "both",
  "qty": 50,
  "score_control": { "enabled": true, "max_attempts": 3 }
}
```


## Agent-sticky single-token mode

Use this for AI clusters where each agent should use exactly one token/profile from the saved provider pool. The provider API key is still hidden inside the Worker.

Each agent passes a stable `agent_id`:

```json
{
  "agent_id": "agent-01",
  "categories": ["Travel"],
  "type": "both",
  "qty": 20,
  "score_control": { "enabled": true, "max_attempts": 3 }
}
```

Equivalent headers are also supported:

```http
X-Agent-Id: agent-01
X-Provider-Pool-Mode: agent_sticky
Authorization: Bearer <REAL_RN_PAT_TOKEN>
```

The API deterministically maps `agent_id` to one profile in the saved pool. Response diagnostics show the assignment:

```json
{
  "provider_pool": {
    "mode": "agent_sticky",
    "strategy": "agent_sticky_single_provider",
    "agent_id": "agent-01",
    "assigned_pool_index": 1,
    "source_pool_size": 3,
    "size": 1
  }
}
```

If your own orchestrator wants explicit control, pass a pool index:

```json
{
  "provider_pool_mode": "agent_sticky",
  "provider_index": 0,
  "categories": ["Travel"],
  "type": "short",
  "qty": 20
}
```

To preview which public profile an agent will use without generating copy:

```http
GET /api/provider-pool/assignment?agent_id=agent-01
Authorization: Bearer <REAL_RN_PAT_TOKEN>
```

This returns profile metadata only, never the real provider key.

## Multi-key provider pool

Use this when generation is slow or one provider key is rate-limited. The Worker will split each category across the available providers in parallel, then merge and score-filter the results. Explicit request-level provider pools override the saved default pool.

Cloud-profile mode, recommended:

```json
{
  "provider": {
    "profile_names": ["DeepSeek 1", "DeepSeek 2", "DeepSeek 3"]
  },
  "categories": ["Travel", "Beauty"],
  "regions": ["US"],
  "language": "en",
  "benefits": ["Authentic user content", "Hidden gems and local tips"],
  "type": "both",
  "qty": 50,
  "score_control": {
    "enabled": true,
    "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
    "max_attempts": 3
  }
}
```

You can also use all cloud-saved profiles in the account:

```json
{
  "provider": { "use_all_profiles": true },
  "categories": ["Travel"],
  "type": "short",
  "qty": 50
}
```

Direct provider-key pool, only when the caller is allowed to receive provider keys:

```json
{
  "providers": [
    { "mode": "openai", "base_url": "https://api.deepseek.com", "model": "deepseek-chat", "api_key": "sk-...1" },
    { "mode": "openai", "base_url": "https://api.deepseek.com", "model": "deepseek-chat", "api_key": "sk-...2" }
  ],
  "categories": ["Travel"],
  "type": "both",
  "qty": 50
}
```

Generation responses include provider-pool diagnostics:

```json
{
  "provider_pool": {
    "size": 3,
    "strategy": "parallel_round_robin_by_category_and_attempt",
    "provider_calls": 3
  },
  "provider_errors": [
    { "profile_name": "DeepSeek 2", "attempt": 1, "error": "..." }
  ]
}
```

If some providers fail but others succeed, the API returns the successful copy and includes `provider_errors`. If all providers fail, the category returns an error.

## Generate copy with score control

```text
POST /api/ad-copy
POST /api/copy
```

Score control parameters:

- `score_control.enabled`: `true` means generated copy is scored server-side and only copy passing all targets is accepted.
- `score_control.targets`: minimum score requirements for `hook`, `rel`, `cta`, `space`, and `total`.
- `score_control.max_attempts`: retry count per category, 1-5. Default is 3 when score control is enabled.
- `score_control.return_rejected`: optionally return rejected candidates and rejection reasons.
- Top-level `targets` is still supported. If `targets` is present, score control is enabled automatically.

Response includes the legacy arrays plus scored item objects and score-control status:

```json
{
  "success": true,
  "categories_requested": 1,
  "categories_succeeded": 1,
  "results": [
    {
      "category": "Lifestyle",
      "short": ["Discover real travel gems"],
      "long": ["Explore real reviews and hidden local tips on __PRODUCT_NAME__"],
      "short_items": [
        {
          "category": "Lifestyle",
          "text": "Discover real travel gems",
          "type": "short",
          "bytes": 25,
          "limit": 25,
          "over_limit": false,
          "score": { "hook": 5, "rel": 8, "cta": 10, "space": 10, "total": 8 },
          "passes_targets": true
        }
      ],
      "long_items": [],
      "items": [],
      "score_control": {
        "enabled": true,
        "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
        "max_attempts": 3,
        "attempts": 2,
        "requested": { "short": 5, "long": 5 },
        "accepted": { "short": 5, "long": 5 },
        "rejected_count": 3,
        "fulfilled": true
      },
      "raw_preview": "..."
    }
  ]
}
```

## Score existing copy

```http
POST /api/score
Content-Type: application/json
```

This endpoint does not require any model key because it uses the same deterministic scoring logic as the web UI.

```json
{
  "benefits": ["Authentic user content", "Hidden gems and local tips"],
  "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
  "ranges": { "total": [7, 10], "space": [5, 10] },
  "copies": [
    { "type": "short", "text": "Discover real travel gems" },
    { "type": "long", "text": "Explore real reviews and hidden local tips on __PRODUCT_NAME__" }
  ]
}
```

Response:

```json
{
  "success": true,
  "count": 2,
  "passed_targets": 1,
  "passed_ranges": 1,
  "average_total": 7.5,
  "targets": { "hook": 6, "rel": 6, "cta": 7, "space": 5, "total": 7 },
  "items": [
    {
      "text": "Discover real travel gems",
      "type": "short",
      "bytes": 25,
      "limit": 25,
      "over_limit": false,
      "score": { "hook": 5, "rel": 8, "relevance": 8, "cta": 10, "space": 10, "space_use": 10, "total": 8 },
      "passes_targets": false,
      "passes_ranges": true
    }
  ]
}
```

## Translate copy

```http
POST /api/translate
Authorization: Bearer <REAL_RN_PAT_TOKEN>
Content-Type: application/json
```

```json
{
  "provider": { "profile_names": ["DeepSeek 1", "DeepSeek 2"] },
  "target_language": "zh-CN",
  "texts": [
    "Discover real travel gems",
    "Explore real reviews and hidden local tips on __PRODUCT_NAME__"
  ]
}
```

## Notes

- Cloud-profile mode stores provider API keys encrypted in Cloudflare KV and isolates them by account.
- Browser-saved local keys are private to that browser. To let API calls reuse a model record, log in on the web UI and sync/save that profile to cloud first.
- Use `rn_pat_...` personal tokens for external AI tools. Do not give external tools your login password. The literal placeholder `rn_pat_xxx` is invalid and will be rejected as an account-token error, not treated as a model key.
- `categories` accepts up to 20 categories per generation request.
- `qty` accepts 1-50 per type per category. With `type: "both"`, each category can return up to 50 short copies plus 50 long copies before score filtering. With multiple profiles/providers, each category is split across the provider pool in parallel.
- For generation quality control, use `score_control.enabled=true`. If `fulfilled=false`, the API did not get enough passing copy within `max_attempts`; inspect `accepted` and optionally call again or lower targets.
- Use `deepseek-chat` first. `deepseek-reasoner` is less stable for strict JSON copy generation.
- Multi-key pools improve throughput when the bottleneck is provider-side concurrency or per-key rate limits. The saved cloud provider pool is reused by API calls automatically when the caller does not pass an explicit provider list. For AI clusters, pass `agent_id` or `provider_index` so each agent uses exactly one assigned profile. Multi-key pools do not fix invalid keys, very strict scoring targets, or slow model latency from the provider.
- Web-only actions such as copying to clipboard, filtering cards on screen, and exporting Excel are represented in API responses as structured score/filter fields, not as browser UI actions.


