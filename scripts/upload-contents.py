#!/usr/bin/env python3
import json, os, sys, base64, urllib.request
from urllib.parse import quote

path, msg, branch = sys.argv[1:4]
with open(path, "rb") as f:
    content_b64 = base64.b64encode(f.read()).decode()
repo = os.environ["GITHUB_REPOSITORY"]
token = os.environ["GH_TOKEN"]
api = f"https://api.github.com/repos/{repo}/contents/{quote(path)}"
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "materialize-upload",
}
sha = None
try:
    req = urllib.request.Request(api + f"?ref={branch}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        sha = json.load(resp).get("sha")
except Exception:
    pass
body = {"message": msg, "content": content_b64, "branch": branch}
if sha:
    body["sha"] = sha
data = json.dumps(body).encode()
req = urllib.request.Request(api, data=data, headers=headers, method="PUT")
with urllib.request.urlopen(req) as resp:
    result = json.load(resp)
print("uploaded", path, result.get("content", {}).get("size"), result.get("commit", {}).get("sha", "")[:10])
