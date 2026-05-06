"""One-off: send the final round scoring rubric to the four finalist teams.

Sends per-team to the four explicitly listed finalist team IDs (no scope
query). Logs BroadcastMessage + BroadcastRecipient + AuditLog. Does NOT
archive as an Announcement (this is finalist-internal logistics, not a
public update). Also sends a single staff summary to the organizers.

Run on the EC2 host from /opt/hh-comp:
    python3 scripts/send-finalist-rubric.py [--dry-run]
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
ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID", "cmnzmon4g0000qq3f3irodihc")

FINALIST_TEAM_IDS = [
    ("cmo3a8nlc0002qu01zz5l99sn", "HerLedger"),
    ("cmo4qoijh004hqu01rdl1p96r", "Predictors"),
    ("cmo851j6e00ciqu017yoo3mtu", "Digital Dash"),
    ("cmo2fijb70002md01oztsaf44", "Team Nexus"),
]

STAFF_EMAILS = [
    "mritter@horizonhobby.com",
    "sridhar@illinois.edu",
    "ashishk@illinois.edu",
    "kolleri+staff@illinois.edu",
]

SUBJECT = "Final round scoring rubric for your May 7 presentation"

BODY_TEXT = """Hi team,

Ahead of your final round presentation on Thursday, May 7, here is how each finalist team will be evaluated. Each of the five scoring variables is weighted equally at 20% of your final score.

Scoring variables:

1. MAPE Score (20%)
2. Grasp of current process and gaps / limitations (0-5, 20%)
3. Calculations of current process accuracy and financial impact (0-5, 20%)
4. Development of forecast for new Late Model launch and impact vs. Horizon Model (0-5, 20%)
5. Clear recommendations for Horizon on how to utilize findings on process improvement (0-5, 20%)

Please structure your presentation so each of these areas is clearly addressed.

If you have any questions, just reply to this email.

Warm regards,
The Horizon Hobby Case Competition Team"""

BODY_HTML_INNER = """<p>Hi team,</p>
<p>Ahead of your final round presentation on <strong>Thursday, May 7</strong>, here is how each finalist team will be evaluated. Each of the five scoring variables is weighted equally at <strong>20% of your final score</strong>.</p>
<p><strong>Scoring variables:</strong></p>
<ol>
  <li><strong>MAPE Score</strong> (20%)</li>
  <li><strong>Grasp of current process and gaps / limitations</strong> (0-5, 20%)</li>
  <li><strong>Calculations of current process accuracy and financial impact</strong> (0-5, 20%)</li>
  <li><strong>Development of forecast for new Late Model launch and impact vs. Horizon Model</strong> (0-5, 20%)</li>
  <li><strong>Clear recommendations for Horizon on how to utilize findings on process improvement</strong> (0-5, 20%)</li>
</ol>
<p>Please structure your presentation so each of these areas is clearly addressed.</p>
<p>If you have any questions, just reply to this email.</p>
<p>Warm regards,<br>The Horizon Hobby Case Competition Team</p>"""

STAFF_SUMMARY_SUBJECT = "FYI: final round scoring rubric sent to the four finalist teams"


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


def fetch_finalist_teams() -> list:
    """Fetch only the four finalist teams by their explicit IDs."""
    id_set = ",".join(sql_quote(tid) for tid, _ in FINALIST_TEAM_IDS)
    rows = psql(
        'SELECT t.id, t.name, COALESCE(string_agg(u.email, \',\' ORDER BY u.email), \'\'), '
        'COALESCE(string_agg(u.name, \',\' ORDER BY u.email), \'\') '
        'FROM "Team" t '
        'LEFT JOIN "TeamMembership" tm ON tm."teamId" = t.id '
        'LEFT JOIN "User" u ON u.id = tm."userId" '
        f'WHERE t.id IN ({id_set}) '
        'GROUP BY t.id, t.name '
        'ORDER BY t.name;'
    ).strip().splitlines()
    teams = []
    for row in rows:
        parts = row.split("\t")
        if len(parts) < 4:
            continue
        team_id, team_name, emails_csv, names_csv = parts[0], parts[1], parts[2], parts[3]
        emails = [e for e in emails_csv.split(",") if e]
        names = [n for n in names_csv.split(",") if n]
        if not emails:
            continue
        teams.append({
            "id": team_id,
            "name": team_name,
            "emails": emails,
            "names": names,
        })
    return teams


def build_staff_summary(finalist_teams, success, failure):
    finalist_lines = []
    for t in finalist_teams:
        roster = ", ".join(t["names"]) if t["names"] else "(no member names)"
        addrs = ", ".join(t["emails"])
        finalist_lines.append(f"  - {t['name']}: {roster}  <{addrs}>")

    text = f"""Hi all,

The final round scoring rubric was just sent to the four finalist teams ahead of the May 7 presentations.

Subject: {SUBJECT}
Sent: {success} team(s) succeeded, {failure} failed
Recipients (per team):
{chr(10).join(finalist_lines)}

Full email body for reference:

{BODY_TEXT}
"""

    finalist_html_lines = "".join(
        f"<li><strong>{t['name']}:</strong> {', '.join(t['names']) if t['names'] else '(no member names)'} &lt;{', '.join(t['emails'])}&gt;</li>"
        for t in finalist_teams
    )

    html_inner = f"""<p>Hi all,</p>
<p>The final round scoring rubric was just sent to the four finalist teams ahead of the May 7 presentations.</p>
<p style="margin:2px 0;"><strong>Subject:</strong> {SUBJECT}</p>
<p style="margin:2px 0;"><strong>Sent:</strong> {success} team(s) succeeded, {failure} failed</p>
<p style="margin:2px 0;"><strong>Recipients (per team):</strong></p>
<ul>{finalist_html_lines}</ul>
<hr>
<p><strong>Full email body for reference:</strong></p>
{BODY_HTML_INNER}"""

    return text, html_inner


def main():
    env = load_env(ROOT / ".env")
    print(f"[rubric] dry_run={DRY_RUN} admin={ADMIN_USER_ID}")

    finalist_teams = fetch_finalist_teams()
    if len(finalist_teams) != len(FINALIST_TEAM_IDS):
        expected = {tid for tid, _ in FINALIST_TEAM_IDS}
        got = {t["id"] for t in finalist_teams}
        missing = expected - got
        raise RuntimeError(
            f"expected {len(FINALIST_TEAM_IDS)} finalist teams, got {len(finalist_teams)}. "
            f"Missing IDs: {missing}"
        )

    print(f"[rubric] FINALISTS: {len(finalist_teams)} teams, {sum(len(t['emails']) for t in finalist_teams)} addrs")
    for t in finalist_teams:
        print(f"  - {t['name']}: {', '.join(t['emails'])}")
    print(f"[rubric] STAFF SUMMARY: 1 email to {len(STAFF_EMAILS)} addrs ({', '.join(STAFF_EMAILS)})")

    if DRY_RUN:
        print("[rubric] dry-run, exiting before any DB writes or sends")
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
        f'{sql_quote(ADMIN_USER_ID)}, \'FINALISTS\', NOW(), NOW(), 0, 0);'
    )
    print(f"[rubric] broadcast row created: {broadcast_id}")

    success = 0
    failure = 0
    for t in finalist_teams:
        try:
            send_gmail(token, sender, sender_name, t["emails"], SUBJECT, full_html, BODY_TEXT)
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "deliveredAt", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(t["id"])}, NOW(), NOW());'
            )
            success += 1
            print(f"  sent: {t['name']} ({len(t['emails'])} addr)")
            time.sleep(0.4)
        except Exception as e:
            failure += 1
            err = str(e).replace("'", "''")[:500]
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "errorMessage", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(t["id"])}, {sql_quote(err)}, NOW());'
            )
            print(f"  FAILED: {t['name']}: {e}")

    psql(
        f'UPDATE "BroadcastMessage" SET "successCount"={success}, "failureCount"={failure} '
        f'WHERE id={sql_quote(broadcast_id)};'
    )

    audit_details = json.dumps({
        "scope": "FINALISTS",
        "recipientCount": success + failure,
        "success": success,
        "failure": failure,
        "via": "scripts/send-finalist-rubric.py",
    }).replace("'", "''")
    psql(
        f'INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", details, "createdAt") '
        f'VALUES ({sql_quote(make_id())}, {sql_quote(ADMIN_USER_ID)}, \'broadcast.send\', \'broadcast\', '
        f'{sql_quote(broadcast_id)}, \'{audit_details}\'::jsonb, NOW());'
    )

    # Staff summary
    print("[rubric] sending STAFF SUMMARY email")
    staff_text, staff_html_inner = build_staff_summary(finalist_teams, success, failure)
    staff_html = wrap_html(staff_html_inner)
    try:
        send_gmail(token, sender, sender_name, STAFF_EMAILS, STAFF_SUMMARY_SUBJECT, staff_html, staff_text)
        print(f"  sent staff summary to {len(STAFF_EMAILS)} addrs")
        psql(
            f'INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", details, "createdAt") '
            f'VALUES ({sql_quote(make_id())}, {sql_quote(ADMIN_USER_ID)}, \'staff.summary.send\', \'email\', '
            f"NULL, '{json.dumps({'recipients': STAFF_EMAILS, 'subject': STAFF_SUMMARY_SUBJECT}).replace(chr(39), chr(39)*2)}'::jsonb, NOW());"
        )
    except Exception as e:
        print(f"  FAILED staff summary: {e}")

    print(f"[rubric] done. success={success} failure={failure}")


if __name__ == "__main__":
    main()
