import os
import sys

import requests


API = "https://api.cloudflare.com/client/v4"
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
WORKER_NAME = "__WORKER_NAME__"


def request(method, path, token, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    if "json" in kwargs:
        headers["Content-Type"] = "application/json"
    response = requests.request(method, f"{API}{path}", headers=headers, timeout=60, **kwargs)
    print(method, path, response.status_code, response.text[:1200])
    return response


def main():
    token = os.environ["CLOUDFLARE_API_TOKEN"]
    if not ACCOUNT_ID:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID is required.")
    candidates = [c.strip() for c in os.environ.get("CLOUDFLARE_WORKERS_SUBDOMAIN_CANDIDATES", "").split(",") if c.strip()]
    if not candidates:
        raise RuntimeError("Set CLOUDFLARE_WORKERS_SUBDOMAIN_CANDIDATES, for example: my-team,my-product-tools")

    for candidate in candidates:
        for payload in (
            {"subdomain": candidate},
            {"name": candidate},
        ):
            response = request(
                "PUT",
                f"/accounts/{ACCOUNT_ID}/workers/subdomain",
                token,
                json=payload,
            )
            if response.ok and response.json().get("success"):
                print(f"SUBDOMAIN={candidate}")
                print(f"LIVE_URL=https://{WORKER_NAME}.{candidate}.workers.dev/")
                return

            response = request(
                "POST",
                f"/accounts/{ACCOUNT_ID}/workers/subdomain",
                token,
                json=payload,
            )
            if response.ok and response.json().get("success"):
                print(f"SUBDOMAIN={candidate}")
                print(f"LIVE_URL=https://{WORKER_NAME}.{candidate}.workers.dev/")
                return

    response = request("GET", f"/accounts/{ACCOUNT_ID}/workers/subdomain", token)
    if response.ok and response.json().get("success"):
        result = response.json().get("result") or {}
        subdomain = result.get("subdomain")
        if subdomain:
            print(f"SUBDOMAIN={subdomain}")
            print(f"LIVE_URL=https://{WORKER_NAME}.{subdomain}.workers.dev/")
            return

    sys.exit(1)


if __name__ == "__main__":
    main()

