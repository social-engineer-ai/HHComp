"""Send a plain test email to verify Gmail pipeline end-to-end."""
import base64, json, sys, urllib.parse, urllib.request
from email.message import EmailMessage
from pathlib import Path

def load_env(path):
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ENV = load_env(Path(__file__).resolve().parent.parent / ".env")

data = urllib.parse.urlencode({
    "client_id": ENV["GOOGLE_CLIENT_ID"],
    "client_secret": ENV["GOOGLE_CLIENT_SECRET"],
    "refresh_token": ENV["GMAIL_REFRESH_TOKEN"],
    "grant_type": "refresh_token",
}).encode()
token = json.loads(urllib.request.urlopen(urllib.request.Request(
    "https://oauth2.googleapis.com/token", data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"})).read())["access_token"]

to = sys.argv[1] if len(sys.argv) > 1 else "ashishk@illinois.edu"
msg = EmailMessage()
msg["From"] = f"{ENV.get('GMAIL_SENDER_NAME','Test')} <{ENV['GMAIL_SENDER_ADDRESS']}>"
msg["To"] = to
msg["Subject"] = "Test from SCM Analytics Competition platform"
msg.set_content(
    "This is a plain-text test email.\n\n"
    "If you got this, Gmail is sending successfully.\n"
    "If you see this in spam, please mark as not spam so future platform emails arrive.\n"
)

raw = base64.urlsafe_b64encode(bytes(msg)).decode("ascii")
body = json.dumps({"raw": raw}).encode()
req = urllib.request.Request(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    data=body,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
res = json.loads(urllib.request.urlopen(req).read())
print(f"Sent: id={res.get('id')} to={to}")
print(f"Label ids: {res.get('labelIds')}")
