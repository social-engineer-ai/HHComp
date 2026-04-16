"""Query Gmail API for a specific message and print its headers and labels."""
import base64, json, sys, urllib.parse, urllib.request
from pathlib import Path

def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ENV = load_env(Path(__file__).resolve().parent.parent / ".env")

def get_token():
    data = urllib.parse.urlencode({
        "client_id": ENV["GOOGLE_CLIENT_ID"],
        "client_secret": ENV["GOOGLE_CLIENT_SECRET"],
        "refresh_token": ENV["GMAIL_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    return json.loads(urllib.request.urlopen(req).read())["access_token"]

def api(path, token):
    req = urllib.request.Request(
        f"https://gmail.googleapis.com/gmail/v1/users/me{path}",
        headers={"Authorization": f"Bearer {token}"})
    return json.loads(urllib.request.urlopen(req).read())

token = get_token()
msg_id = sys.argv[1] if len(sys.argv) > 1 else "19d9134104f9ca80"

print(f"=== Message {msg_id} ===")
m = api(f"/messages/{msg_id}?format=metadata&metadataHeaders=To&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Delivered-To", token)
print(f"Labels:  {m.get('labelIds')}")
print(f"Snippet: {m.get('snippet', '')[:200]}")
for h in m.get("payload", {}).get("headers", []):
    print(f"  {h['name']}: {h['value']}")
print()

print("=== 5 most recent messages in account ===")
recent = api("/messages?maxResults=5", token)
for x in recent.get("messages", []):
    xm = api(f"/messages/{x['id']}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=From", token)
    labels = xm.get("labelIds", [])
    subj = next((h["value"] for h in xm["payload"]["headers"] if h["name"] == "Subject"), "")
    to = next((h["value"] for h in xm["payload"]["headers"] if h["name"] == "To"), "")
    print(f"  {x['id']} [{','.join(labels)}]")
    print(f"    To: {to}")
    print(f"    Subject: {subj}")
