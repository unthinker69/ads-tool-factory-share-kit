import base64
import secrets
import json
import os
import sys
import time
from pathlib import Path

import requests


API = "https://api.cloudflare.com/client/v4"
WORKER_NAME = "__WORKER_NAME__"
KV_TITLE = "__KV_TITLE__"
ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "public" / "index.html"


def compatibility_date():
    config_path = ROOT / "wrangler.jsonc"
    if not config_path.exists():
        return "2026-07-01"
    for line in config_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith('"compatibility_date"'):
            return stripped.split(':', 1)[1].strip().strip(',').strip('"')
    return "2026-07-01"


def cf_request(method, path, token, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    last_exc = None
    for attempt in range(1, 6):
        try:
            response = requests.request(method, f"{API}{path}", headers=headers, timeout=60, **kwargs)
            break
        except requests.RequestException as exc:
            last_exc = exc
            if attempt == 5:
                raise
            time.sleep(attempt * 2)
    else:
        raise last_exc
    try:
        data = response.json()
    except ValueError:
        raise RuntimeError(f"Cloudflare returned non-JSON response: {response.status_code} {response.text[:300]}")
    if not response.ok or not data.get("success", False):
        raise RuntimeError(json.dumps(data.get("errors") or data, ensure_ascii=False))
    return data["result"]


def pick_account(token):
    accounts = cf_request("GET", "/accounts", token)
    if not accounts:
        raise RuntimeError("No Cloudflare account is available for this API token.")
    if len(accounts) > 1:
        names = ", ".join(f"{a.get('name')} ({a.get('id')})" for a in accounts)
        print(f"Multiple accounts found; using the first one: {names}")
    return accounts[0]


def build_worker_script():
    html = HTML_PATH.read_text(encoding="utf-8")
    template_path = ROOT / "src" / "worker_api_template.js"
    template = template_path.read_text(encoding="utf-8")
    app_secret = get_or_create_app_secret()
    return (
        template
        .replace("__INDEX_HTML_JSON__", json.dumps(html, ensure_ascii=False))
        .replace("__APP_SECRET_JSON__", json.dumps(app_secret))
    )


def get_or_create_app_secret():
    secret_dir = ROOT / ".secrets"
    secret_dir.mkdir(exist_ok=True)
    secret_path = secret_dir / "worker_app_secret.txt"
    if secret_path.exists():
        value = secret_path.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = base64.urlsafe_b64encode(secrets.token_bytes(48)).decode("ascii")
    secret_path.write_text(value, encoding="utf-8")
    return value


def get_or_create_kv_namespace(token, account_id):
    result = cf_request("GET", f"/accounts/{account_id}/storage/kv/namespaces?per_page=100", token)
    for ns in result:
        if ns.get("title") == KV_TITLE:
            return ns["id"]
    created = cf_request("POST", f"/accounts/{account_id}/storage/kv/namespaces", token, json={"title": KV_TITLE})
    return created["id"]


def upload_worker(token, account_id, script, kv_namespace_id):
    metadata = {
        "main_module": f"{WORKER_NAME}.mjs",
        "compatibility_date": compatibility_date(),
        "bindings": [
            {
                "type": "kv_namespace",
                "name": "CONFIG_KV",
                "namespace_id": kv_namespace_id
            }
        ],
    }
    files = {
        "metadata": (None, json.dumps(metadata), "application/json"),
        f"{WORKER_NAME}.mjs": (f"{WORKER_NAME}.mjs", script, "application/javascript+module"),
    }
    return cf_request(
        "PUT",
        f"/accounts/{account_id}/workers/scripts/{WORKER_NAME}",
        token,
        files=files,
    )


def get_subdomain(token, account_id):
    for path in (
        f"/accounts/{account_id}/workers/subdomain",
        f"/accounts/{account_id}/workers/subdomains",
    ):
        try:
            result = cf_request("GET", path, token)
            if isinstance(result, dict):
                return result.get("subdomain") or result.get("name")
        except Exception:
            pass
    return None


def enable_workers_dev(token, account_id):
    path = f"/accounts/{account_id}/workers/scripts/{WORKER_NAME}/subdomain"
    result = None
    for method, kwargs in (
        ("GET", {}),
        ("POST", {"json": {"enabled": True}}),
        ("GET", {}),
    ):
        try:
            result = cf_request(method, path, token, **kwargs)
            print(f"{method} script subdomain: {json.dumps(result, ensure_ascii=False)}")
        except Exception as exc:
            print(f"{method} script subdomain failed: {exc}")
    if isinstance(result, dict):
        return result.get("url") or result.get("subdomain") or result.get("enabled")
    return None


def main():
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is required.")

    account = pick_account(token)
    account_id = account["id"]
    print(f"Using Cloudflare account: {account.get('name')} ({account_id})")

    kv_namespace_id = get_or_create_kv_namespace(token, account_id)
    print(f"Using KV namespace: {KV_TITLE} ({kv_namespace_id})")

    script = build_worker_script()
    result = upload_worker(token, account_id, script, kv_namespace_id)
    print(f"Uploaded Worker: {WORKER_NAME}")
    if isinstance(result, dict) and result.get("id"):
        print(f"Worker id: {result['id']}")

    route_result = enable_workers_dev(token, account_id)
    if isinstance(route_result, str) and route_result.startswith("http"):
        print(f"LIVE_URL={route_result}")
        return

    subdomain = get_subdomain(token, account_id)
    if subdomain:
        print(f"LIVE_URL=https://{WORKER_NAME}.{subdomain}.workers.dev/")
    else:
        print("LIVE_URL_UNKNOWN=workers.dev subdomain could not be read from the API")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"DEPLOY_FAILED={exc}", file=sys.stderr)
        sys.exit(1)



