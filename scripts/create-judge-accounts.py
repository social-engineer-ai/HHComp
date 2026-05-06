"""One-off: create MANAGER (judge) accounts for the May 7 final round.

Inserts User rows for the two external judges, generates strong temp
passwords, hashes them with the same bcryptjs the app uses, and emails
each judge their credentials with the staff list CC'd. Refuses to run
if either email already exists.

Run on the EC2 host from /opt/hh-comp:
    python3 scripts/create-judge-accounts.py [--dry-run]
"""
import base64
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import uuid
from email.message import EmailMessage
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv
ROOT = Path(__file__).resolve().parent.parent
ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID", "cmnzmon4g0000qq3f3irodihc")

JUDGES = [
    {"name": "Mohammad", "email": "moshref@illinois.edu"},
    {"name": "Ismail",   "email": "ikirci@illinois.edu"},
]

CC_EMAILS = [
    "sridhar@illinois.edu",
    "mritter@horizonhobby.com",
    "ashishk@illinois.edu",
    "kolleri2@illinois.edu",
]

LOGIN_URL = "https://16-59-203-133.sslip.io/login"
SUBMISSIONS_URL = "https://16-59-203-133.sslip.io/admin/submissions"

SUBJECT = "Your judge account for the Horizon Hobby Case Competition"


def other_judge_name(self_name: str) -> str:
    for j in JUDGES:
        if j["name"] != self_name:
            return j["name"]
    return ""


def body_text(name: str, email: str, temp_password: str) -> str:
    other = other_judge_name(name)
    return f"""Hi {name},

You're confirmed as a judge for the final round of the 2026 Horizon Hobby Case Competition presentations on Thursday, May 7. We've created a manager account for you on the competition platform so you can review the four finalist teams' written submissions ahead of the presentations.

Login details:
  URL:      {LOGIN_URL}
  Email:    {email}
  Password: {temp_password}

Once logged in, go to "Submissions" in the left nav, or directly to:
  {SUBMISSIONS_URL}

You'll see the four finalist teams (Digital Dash, HerLedger, Predictors, Team Nexus). Each team has four downloadable components: prediction file, code, methodology PDF, and presentation slides.

If you'd like to set your own password, use the "Forgot password" link on the login page after first login.

The other judges are {other} and Michael Ritter (Horizon Hobby).

If you have any trouble accessing the platform, reply to this email.

Warm regards,
The Horizon Hobby Case Competition Team"""


def body_html_inner(name: str, email: str, temp_password: str) -> str:
    other = other_judge_name(name)
    return f"""<p>Hi {name},</p>
<p>You're confirmed as a judge for the final round of the 2026 Horizon Hobby Case Competition presentations on <strong>Thursday, May 7</strong>. We've created a manager account for you on the competition platform so you can review the four finalist teams' written submissions ahead of the presentations.</p>
<p><strong>Login details:</strong></p>
<table style="border-collapse:collapse; font-family: Menlo, Consolas, monospace; font-size: 13px;">
  <tr><td style="padding:4px 12px 4px 0; color:#666;">URL:</td><td><a href="{LOGIN_URL}">{LOGIN_URL}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Email:</td><td>{email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Password:</td><td><code style="background:#f4f4f4; padding:2px 6px; border-radius:3px;">{temp_password}</code></td></tr>
</table>
<p>Once logged in, go to <strong>Submissions</strong> in the left nav, or directly to:</p>
<p><a href="{SUBMISSIONS_URL}" style="display:inline-block; padding: 10px 18px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Open submissions</a></p>
<p>You'll see the four finalist teams (Digital Dash, HerLedger, Predictors, Team Nexus). Each team has four downloadable components: prediction file, code, methodology PDF, and presentation slides.</p>
<p>If you'd like to set your own password, use the "Forgot password" link on the login page after first login.</p>
<p>The other judges are {other} and Michael Ritter (Horizon Hobby).</p>
<p>If you have any trouble accessing the platform, reply to this email.</p>
<p>Warm regards,<br>The Horizon Hobby Case Competition Team</p>"""


def wrap_html(inner: str) -> str:
    return f"""<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.55;">
  <div style="border-top: 4px solid #E31837; padding: 24px 0; border-bottom: 1px solid #eee; margin-bottom: 24px;">
    <h1 style="margin:0; font-size: 20px; letter-spacing: -0.01em;">Supply Chain Analytics Competition 2026</h1>
    <p style="margin: 4px 0 0; color:#666; font-size: 13px;">Gies College of Business x Horizon Hobby</p>
  </div>
  {inner}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color:#888; font-size: 12px;">
    If you did not expect this email, you can safely ignore it.
  </div>
</div>"""


def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def psql(sql: str) -> str:
    cmd = [
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", "hhcomp", "-d", "hhcomp", "-tA", "-F", "\t", "-c", sql,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr}")
    return r.stdout


def sql_quote(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def bcrypt_hash(plain: str) -> str:
    """Hash with bcrypt cost=12. Produces a $2b$ hash, which is the same
    format the app's bcryptjs ^3.0.3 produces and verifies."""
    import bcrypt
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def generate_temp_password(length: int = 16) -> str:
    # No ambiguous chars: 0/O, 1/l/I removed
    alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_access_token(env: dict) -> str:
    data = urllib.parse.urlencode({
        "client_id": env["GOOGLE_CLIENT_ID"],
        "client_secret": env["GOOGLE_CLIENT_SECRET"],
        "refresh_token": env["GMAIL_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return json.loads(urllib.request.urlopen(req).read())["access_token"]


def send_gmail(token, sender, sender_name, to_emails, cc_emails, subject, html, text):
    msg = EmailMessage()
    msg["From"] = f"{sender_name} <{sender}>" if sender_name else sender
    msg["To"] = ", ".join(to_emails)
    if cc_emails:
        msg["Cc"] = ", ".join(cc_emails)
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    raw = base64.urlsafe_b64encode(bytes(msg)).decode("ascii")
    body = json.dumps({"raw": raw}).encode()
    req = urllib.request.Request(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    urllib.request.urlopen(req).read()


def make_id() -> str:
    return "c" + uuid.uuid4().hex[:24]


def main():
    env = load_env(ROOT / ".env")
    print(f"[judges] dry_run={DRY_RUN}")

    # Pre-flight: ensure neither email already exists
    for j in JUDGES:
        emaillower = j["email"].lower()
        existing = psql(f'SELECT id, role FROM "User" WHERE "emailLower" = {sql_quote(emaillower)};').strip()
        if existing:
            raise RuntimeError(f"User already exists for {emaillower}: {existing}")
    print("[judges] pre-flight ok: neither email exists yet")

    # Generate temp passwords + ids up front so dry-run shows the plan
    for j in JUDGES:
        j["temp_password"] = generate_temp_password()
        j["user_id"] = make_id()

    print("[judges] plan:")
    for j in JUDGES:
        print(f"  - {j['name']} <{j['email']}> -> id={j['user_id']} pw={j['temp_password']}")
    print(f"[judges] CC list: {', '.join(CC_EMAILS)}")

    if DRY_RUN:
        print("[judges] dry-run, exiting before any DB writes or sends")
        return

    # Hash passwords inside the app container (same bcryptjs the app uses)
    for j in JUDGES:
        j["password_hash"] = bcrypt_hash(j["temp_password"])
        print(f"  hashed password for {j['email']}")

    # Insert User rows + audit log
    for j in JUDGES:
        emaillower = j["email"].lower()
        psql(
            f'INSERT INTO "User" '
            f'(id, name, email, "emailLower", "passwordHash", role, '
            f'"emailVerifiedAt", "isActive", "failedLoginCount", "createdAt", "updatedAt") '
            f'VALUES ({sql_quote(j["user_id"])}, {sql_quote(j["name"])}, '
            f'{sql_quote(emaillower)}, {sql_quote(emaillower)}, '
            f'{sql_quote(j["password_hash"])}, \'MANAGER\', '
            f'NOW(), true, 0, NOW(), NOW());'
        )
        print(f"  inserted User row for {j['email']} (id={j['user_id']})")

        details = json.dumps({
            "email": emaillower,
            "role": "MANAGER",
            "via": "scripts/create-judge-accounts.py",
        }).replace("'", "''")
        psql(
            f'INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", details, "createdAt") '
            f'VALUES ({sql_quote(make_id())}, {sql_quote(ADMIN_USER_ID)}, \'user.create_staff\', \'user\', '
            f'{sql_quote(j["user_id"])}, \'{details}\'::jsonb, NOW());'
        )

    # Send welcome emails
    token = get_access_token(env)
    sender = env["GMAIL_SENDER_ADDRESS"]
    sender_name = env.get("GMAIL_SENDER_NAME", "")

    for j in JUDGES:
        text = body_text(j["name"], j["email"], j["temp_password"])
        html = wrap_html(body_html_inner(j["name"], j["email"], j["temp_password"]))
        try:
            send_gmail(token, sender, sender_name, [j["email"]], CC_EMAILS, SUBJECT, html, text)
            print(f"  sent welcome to {j['email']} (CC: {len(CC_EMAILS)} addrs)")
            time.sleep(0.4)
        except Exception as e:
            print(f"  FAILED to send welcome to {j['email']}: {e}")

    print("[judges] done")
    print()
    print("Temp passwords (in case email delivery is delayed or filtered):")
    for j in JUDGES:
        print(f"  {j['email']:30s}  {j['temp_password']}")


if __name__ == "__main__":
    main()
