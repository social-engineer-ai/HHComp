"""One-off broadcast: deadline reminder to all registered teams.

Mirrors what the /admin/broadcast UI does: sends email per team, writes
BroadcastMessage + BroadcastRecipient + AuditLog, and archives as Announcement.

Run on the EC2 host from /opt/hh-comp:
    python3 scripts/send-deadline-reminder.py [--dry-run]
"""
import base64
import json
import os
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

SCOPE = "ALL_REGISTERED"
ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID", "cmnzmon4g0000qq3f3irodihc")

SUBJECT = "Reminder: submission deadline tomorrow at 11:59 PM Central"

BODY_TEXT = """Hi team,

Quick reminder that the 2026 Supply Chain Analytics Competition submission deadline is tomorrow, Friday May 1 at 11:59 PM Central.

If you haven't uploaded all four components yet (prediction file, code, methodology PDF, presentation slides), log in to your dashboard and finish up: https://16-59-203-133.sslip.io/submissions

The latest version of each component is what gets scored, so you can keep iterating right up to the deadline.

Reach out at uiucbadm576@gmail.com if anything is blocking you.

Gies + Horizon Hobby"""

BODY_HTML_INNER = """<p>Hi team,</p>
<p>Quick reminder that the 2026 Supply Chain Analytics Competition submission deadline is <strong>tomorrow, Friday May 1 at 11:59 PM Central</strong>.</p>
<p>If you haven't uploaded all four components yet (prediction file, code, methodology PDF, presentation slides), log in to your dashboard and finish up:</p>
<p><a href="https://16-59-203-133.sslip.io/submissions" style="display:inline-block; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Go to submissions</a></p>
<p>The latest version of each component is what gets scored, so you can keep iterating right up to the deadline.</p>
<p>Reach out at <a href="mailto:uiucbadm576@gmail.com">uiucbadm576@gmail.com</a> if anything is blocking you.</p>
<p>Gies + Horizon Hobby</p>"""


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
    """Run SQL via docker compose exec postgres. Returns stdout."""
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


def send_gmail(token: str, sender: str, sender_name: str, to_emails: list, subject: str, html: str, text: str):
    msg = EmailMessage()
    msg["From"] = f"{sender_name} <{sender}>" if sender_name else sender
    msg["To"] = ", ".join(to_emails)
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
    print(f"[reminder] dry_run={DRY_RUN} scope={SCOPE} admin={ADMIN_USER_ID}")

    rows = psql(
        'SELECT t.id, t.name, COALESCE(string_agg(u.email, \',\' ORDER BY u.email), \'\') '
        'FROM "Team" t '
        'LEFT JOIN "TeamMembership" tm ON tm."teamId" = t.id '
        'LEFT JOIN "User" u ON u.id = tm."userId" '
        'WHERE t.name NOT LIKE \'Test Team%\' '
        'GROUP BY t.id, t.name '
        'ORDER BY t.name;'
    ).strip().splitlines()

    teams = []
    for row in rows:
        parts = row.split("\t")
        if len(parts) < 3:
            continue
        team_id, team_name, emails_csv = parts[0], parts[1], parts[2]
        emails = [e for e in emails_csv.split(",") if e]
        if not emails:
            continue
        teams.append((team_id, team_name, emails))

    print(f"[reminder] {len(teams)} teams in scope, {sum(len(t[2]) for t in teams)} email addresses total")
    for tid, name, emails in teams:
        print(f"  - {name}: {', '.join(emails)}")

    if DRY_RUN:
        print("[reminder] dry-run, exiting before send and DB writes")
        return

    token = get_access_token(env)
    sender = env["GMAIL_SENDER_ADDRESS"]
    sender_name = env.get("GMAIL_SENDER_NAME", "")

    broadcast_id = make_id()
    full_html = wrap_html(BODY_HTML_INNER)

    psql(
        f'INSERT INTO "BroadcastMessage" '
        f'(id, subject, body, "authorId", "recipientScope", "sentAt", "createdAt", "successCount", "failureCount") '
        f'VALUES ({sql_quote(broadcast_id)}, {sql_quote(SUBJECT)}, {sql_quote(BODY_TEXT)}, '
        f'{sql_quote(ADMIN_USER_ID)}, \'{SCOPE}\', NOW(), NOW(), 0, 0);'
    )
    print(f"[reminder] broadcast row created: {broadcast_id}")

    success = 0
    failure = 0
    for tid, name, emails in teams:
        try:
            send_gmail(token, sender, sender_name, emails, SUBJECT, full_html, BODY_TEXT)
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "deliveredAt", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(tid)}, NOW(), NOW());'
            )
            success += 1
            print(f"  sent to {name} ({len(emails)} addr)")
            time.sleep(0.4)
        except Exception as e:
            failure += 1
            err = str(e).replace("'", "''")[:500]
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "errorMessage", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(tid)}, {sql_quote(err)}, NOW());'
            )
            print(f"  FAILED {name}: {e}")

    psql(
        f'UPDATE "BroadcastMessage" SET "successCount"={success}, "failureCount"={failure} '
        f'WHERE id={sql_quote(broadcast_id)};'
    )

    ann_id = make_id()
    psql(
        f'INSERT INTO "Announcement" (id, title, body, "authorId", "fromBroadcastId", "createdAt", "updatedAt") '
        f'VALUES ({sql_quote(ann_id)}, {sql_quote(SUBJECT)}, {sql_quote(BODY_TEXT)}, '
        f'{sql_quote(ADMIN_USER_ID)}, {sql_quote(broadcast_id)}, NOW(), NOW());'
    )

    audit_details = json.dumps({
        "scope": SCOPE,
        "recipientCount": success + failure,
        "success": success,
        "failure": failure,
        "via": "scripts/send-deadline-reminder.py",
    }).replace("'", "''")
    psql(
        f'INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", details, "createdAt") '
        f'VALUES ({sql_quote(make_id())}, {sql_quote(ADMIN_USER_ID)}, \'broadcast.send\', \'broadcast\', '
        f'{sql_quote(broadcast_id)}, \'{audit_details}\'::jsonb, NOW());'
    )

    print(f"[reminder] done. success={success} failure={failure}")


if __name__ == "__main__":
    main()
