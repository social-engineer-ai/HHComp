"""Email an arbitrary file as an attachment via Gmail OAuth.

Usage: python scripts/email-file.py <recipient> <path-to-file> [subject] [body]
"""
import base64, json, mimetypes, sys, urllib.parse, urllib.request
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

if len(sys.argv) < 3:
    print("Usage: python scripts/email-file.py <recipient> <path-to-file> [subject] [body]")
    sys.exit(1)

recipient = sys.argv[1]
file_path = Path(sys.argv[2])
subject = sys.argv[3] if len(sys.argv) > 3 else f"Attachment: {file_path.name}"
body_text = sys.argv[4] if len(sys.argv) > 4 else f"Attached: {file_path.name}"

if not file_path.exists():
    print(f"File not found: {file_path}")
    sys.exit(1)

# Get access token
data = urllib.parse.urlencode({
    "client_id": ENV["GOOGLE_CLIENT_ID"],
    "client_secret": ENV["GOOGLE_CLIENT_SECRET"],
    "refresh_token": ENV["GMAIL_REFRESH_TOKEN"],
    "grant_type": "refresh_token",
}).encode()
token = json.loads(urllib.request.urlopen(urllib.request.Request(
    "https://oauth2.googleapis.com/token", data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"})).read())["access_token"]

# Build message
msg = EmailMessage()
msg["From"] = f"{ENV.get('GMAIL_SENDER_NAME', 'Sender')} <{ENV['GMAIL_SENDER_ADDRESS']}>"
msg["To"] = recipient
msg["Subject"] = subject
msg.set_content(body_text)

ctype, _ = mimetypes.guess_type(file_path.name)
if ctype is None:
    ctype = "application/octet-stream"
maintype, subtype = ctype.split("/", 1)
with open(file_path, "rb") as fh:
    msg.add_attachment(fh.read(), maintype=maintype, subtype=subtype, filename=file_path.name)

raw = base64.urlsafe_b64encode(bytes(msg)).decode("ascii")
body = json.dumps({"raw": raw}).encode()
req = urllib.request.Request(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    data=body,
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
res = json.loads(urllib.request.urlopen(req).read())
print(f"Sent: id={res.get('id')} to={recipient} file={file_path.name} ({file_path.stat().st_size} bytes)")
