import os
import requests


API = "https://api.cloudflare.com/client/v4"
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
WORKER_NAME = "__WORKER_NAME__"


def main():
    token = os.environ["CLOUDFLARE_API_TOKEN"]
    if not ACCOUNT_ID:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID is required.")
    headers = {"Authorization": f"Bearer {token}"}
    paths = [
        f"/accounts/{ACCOUNT_ID}/workers/subdomain",
        f"/accounts/{ACCOUNT_ID}/workers/subdomains",
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}/subdomain",
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER_NAME}",
        f"/accounts/{ACCOUNT_ID}/workers/services/{WORKER_NAME}",
        f"/accounts/{ACCOUNT_ID}/workers/workers",
    ]
    for path in paths:
        try:
            response = requests.get(f"{API}{path}", headers=headers, timeout=30)
            print("GET", path, response.status_code, response.text[:2000])
        except Exception as exc:
            print("ERR", path, repr(exc))


if __name__ == "__main__":
    main()

