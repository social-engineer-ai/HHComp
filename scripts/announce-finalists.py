"""One-off: announce the four finalist teams.

Sends three pieces of mail:
  1. FINALISTS scope: per-team congratulations to the four finalist teams.
  2. ALL_COMPLETE scope: per-team public results email to every COMPLETE team
     (excluding Test Team fixtures), archived as a public Announcement.
  3. Staff summary: a single email to the four organizing staff with subjects,
     recipient counts, and full email bodies inline for reference.

Also flips Team.isFinalist=true and sets finalistNotifiedAt for the four
selected teams before the FINALISTS broadcast (the broadcast scope filter
relies on that flag).

Run on the EC2 host from /opt/hh-comp:
    python3 scripts/announce-finalists.py [--dry-run]
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

# ---------------------------------------------------------------------------
# Email content
# ---------------------------------------------------------------------------

FINALIST_SUBJECT = "You have advanced to the final round of the Horizon Hobby Case Competition"

FINALIST_TEXT = """Congratulations from all of us at Horizon Hobby.

After a careful review of every submission, your team has been selected to advance to the final round of the competition. The work we received this year was genuinely impressive across the board, and the margins between the leading teams were narrow enough that we chose to expand the final round from three teams to four. Your team is one of those four.

In reviewing the submissions, our team weighed several dimensions together, including the rigor of the methodology, the feasibility of applying the proposed approach across our broader portfolio of Horizon Hobby products, performance on the holdout data, and the strength of the business insights and recommendations drawn from the analysis. Your work stood out across these criteria.

The four finalist teams (in alphabetical order) are:

- Digital Dash (Gregory Jaison, Amshuman Gopalakrishnan)
- HerLedger (Xinying Fu, Narinda Tanvilai)
- Predictors (Emaad Siddique, Juan Carlos Zapata Figueroa)
- Team Nexus (Hasnain Khan, Harvin Patel)

Next step: live presentation to the Horizon Hobby team. Final ranking will be determined after the presentations. We will follow up shortly with the presentation date, time, format, and logistics.

If you have any questions in the meantime, please reply to this email.

Congratulations again, and thank you for the work you put into this.

Warm regards,
The Horizon Hobby Case Competition Team"""

FINALIST_HTML_INNER = """<p>Congratulations from all of us at Horizon Hobby.</p>
<p>After a careful review of every submission, your team has been selected to advance to the <strong>final round</strong> of the competition. The work we received this year was genuinely impressive across the board, and the margins between the leading teams were narrow enough that we chose to expand the final round from three teams to four. Your team is one of those four.</p>
<p>In reviewing the submissions, our team weighed several dimensions together, including the rigor of the methodology, the feasibility of applying the proposed approach across our broader portfolio of Horizon Hobby products, performance on the holdout data, and the strength of the business insights and recommendations drawn from the analysis. Your work stood out across these criteria.</p>
<p>The four finalist teams (in alphabetical order) are:</p>
<ul>
  <li>Digital Dash (Gregory Jaison, Amshuman Gopalakrishnan)</li>
  <li>HerLedger (Xinying Fu, Narinda Tanvilai)</li>
  <li>Predictors (Emaad Siddique, Juan Carlos Zapata Figueroa)</li>
  <li>Team Nexus (Hasnain Khan, Harvin Patel)</li>
</ul>
<p><strong>Next step: live presentation to the Horizon Hobby team.</strong> Final ranking will be determined after the presentations. We will follow up shortly with the presentation date, time, format, and logistics.</p>
<p>If you have any questions in the meantime, please reply to this email.</p>
<p>Congratulations again, and thank you for the work you put into this.</p>
<p>Warm regards,<br>The Horizon Hobby Case Competition Team</p>"""

ALL_TEAMS_SUBJECT = "Horizon Hobby Case Competition: finalists announced"

ALL_TEAMS_TEXT = """To every team that participated in this year's Horizon Hobby Case Competition: thank you.

We want to begin by recognizing every one of you. The volume and quality of work we received this year was outstanding, and selecting a small number of finalists was genuinely difficult. The margins between the leading submissions were close enough that we chose to expand the final round from three teams to four.

In reviewing the submissions, our team weighed several dimensions together, including the rigor of the methodology, the feasibility of applying the proposed approach across our broader portfolio of Horizon Hobby products, performance on the holdout data, and the strength of the business insights and recommendations drawn from the analysis. Many submissions were strong on one or two of these and a smaller number were strong across all of them.

The four finalist teams (in alphabetical order) are:

- Digital Dash: Gregory Jaison, Amshuman Gopalakrishnan
- HerLedger: Xinying Fu, Narinda Tanvilai
- Predictors: Emaad Siddique, Juan Carlos Zapata Figueroa
- Team Nexus: Hasnain Khan, Harvin Patel

These four teams will present to the Horizon Hobby team in the next round, and final placement will be determined after those presentations.

To every other team: thank you for the time, the analysis, and the ideas you brought to this. The work was real, the engagement was real, and we want you to know it was noticed and appreciated. We hope this competition was a useful experience and we wish you the very best in what comes next.

Warm regards,
The Horizon Hobby Case Competition Team"""

ALL_TEAMS_HTML_INNER = """<p>To every team that participated in this year's Horizon Hobby Case Competition: thank you.</p>
<p>We want to begin by recognizing every one of you. The volume and quality of work we received this year was outstanding, and selecting a small number of finalists was genuinely difficult. The margins between the leading submissions were close enough that we chose to expand the final round from three teams to four.</p>
<p>In reviewing the submissions, our team weighed several dimensions together, including the rigor of the methodology, the feasibility of applying the proposed approach across our broader portfolio of Horizon Hobby products, performance on the holdout data, and the strength of the business insights and recommendations drawn from the analysis. Many submissions were strong on one or two of these and a smaller number were strong across all of them.</p>
<p><strong>The four finalist teams (in alphabetical order) are:</strong></p>
<ul>
  <li><strong>Digital Dash:</strong> Gregory Jaison, Amshuman Gopalakrishnan</li>
  <li><strong>HerLedger:</strong> Xinying Fu, Narinda Tanvilai</li>
  <li><strong>Predictors:</strong> Emaad Siddique, Juan Carlos Zapata Figueroa</li>
  <li><strong>Team Nexus:</strong> Hasnain Khan, Harvin Patel</li>
</ul>
<p>These four teams will present to the Horizon Hobby team in the next round, and final placement will be determined after those presentations.</p>
<p>To every other team: thank you for the time, the analysis, and the ideas you brought to this. The work was real, the engagement was real, and we want you to know it was noticed and appreciated. We hope this competition was a useful experience and we wish you the very best in what comes next.</p>
<p>Warm regards,<br>The Horizon Hobby Case Competition Team</p>"""

STAFF_SUMMARY_SUBJECT = "FYI: case competition finalist announcements sent"


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


def fetch_teams(where_sql: str) -> list:
    rows = psql(
        'SELECT t.id, t.name, COALESCE(string_agg(u.email, \',\' ORDER BY u.email), \'\'), '
        'COALESCE(string_agg(u.name, \',\' ORDER BY u.email), \'\') '
        'FROM "Team" t '
        'LEFT JOIN "TeamMembership" tm ON tm."teamId" = t.id '
        'LEFT JOIN "User" u ON u.id = tm."userId" '
        f'WHERE {where_sql} '
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


def send_per_team_blast(token, sender, sender_name, env, scope, subject, body_text, body_html, teams, archive_as_announcement):
    """Send per-team. Logs BroadcastMessage + BroadcastRecipient + AuditLog. Optionally creates Announcement."""
    broadcast_id = make_id()
    psql(
        f'INSERT INTO "BroadcastMessage" '
        f'(id, subject, body, "authorId", "recipientScope", "sentAt", "createdAt", "successCount", "failureCount") '
        f'VALUES ({sql_quote(broadcast_id)}, {sql_quote(subject)}, {sql_quote(body_text)}, '
        f'{sql_quote(ADMIN_USER_ID)}, \'{scope}\', NOW(), NOW(), 0, 0);'
    )
    print(f"  [broadcast {scope}] row={broadcast_id}")

    success = 0
    failure = 0
    for t in teams:
        try:
            send_gmail(token, sender, sender_name, t["emails"], subject, body_html, body_text)
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "deliveredAt", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(t["id"])}, NOW(), NOW());'
            )
            success += 1
            print(f"    sent: {t['name']} ({len(t['emails'])} addr)")
            time.sleep(0.4)
        except Exception as e:
            failure += 1
            err = str(e).replace("'", "''")[:500]
            psql(
                f'INSERT INTO "BroadcastRecipient" (id, "broadcastId", "teamId", "errorMessage", "createdAt") '
                f'VALUES ({sql_quote(make_id())}, {sql_quote(broadcast_id)}, {sql_quote(t["id"])}, {sql_quote(err)}, NOW());'
            )
            print(f"    FAILED: {t['name']}: {e}")

    psql(
        f'UPDATE "BroadcastMessage" SET "successCount"={success}, "failureCount"={failure} '
        f'WHERE id={sql_quote(broadcast_id)};'
    )

    if archive_as_announcement:
        ann_id = make_id()
        psql(
            f'INSERT INTO "Announcement" (id, title, body, "authorId", "fromBroadcastId", "createdAt", "updatedAt") '
            f'VALUES ({sql_quote(ann_id)}, {sql_quote(subject)}, {sql_quote(body_text)}, '
            f'{sql_quote(ADMIN_USER_ID)}, {sql_quote(broadcast_id)}, NOW(), NOW());'
        )
        print(f"    archived as Announcement: {ann_id}")

    audit_details = json.dumps({
        "scope": scope,
        "recipientCount": success + failure,
        "success": success,
        "failure": failure,
        "via": "scripts/announce-finalists.py",
    }).replace("'", "''")
    psql(
        f'INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", details, "createdAt") '
        f'VALUES ({sql_quote(make_id())}, {sql_quote(ADMIN_USER_ID)}, \'broadcast.send\', \'broadcast\', '
        f'{sql_quote(broadcast_id)}, \'{audit_details}\'::jsonb, NOW());'
    )

    return success, failure


def build_staff_summary(finalist_teams, all_teams, finalist_success, finalist_failure, all_success, all_failure):
    finalist_lines = []
    for t in finalist_teams:
        roster = ", ".join(t["names"]) if t["names"] else "(no member names)"
        addrs = ", ".join(t["emails"])
        finalist_lines.append(f"  - {t['name']}: {roster}  <{addrs}>")
    all_lines = []
    for t in all_teams:
        addrs = ", ".join(t["emails"])
        all_lines.append(f"  - {t['name']}: {addrs}")

    text = f"""Hi all,

The two case competition announcement emails went out today. Quick summary, then full bodies for your reference.

--------------------------------------------------------
1) Finalist email
   Subject: {FINALIST_SUBJECT}
   Sent: {finalist_success} team(s) succeeded, {finalist_failure} failed
   Recipients (per team):
{chr(10).join(finalist_lines)}

2) All-teams public results email
   Subject: {ALL_TEAMS_SUBJECT}
   Sent: {all_success} team(s) succeeded, {all_failure} failed (Test Team fixtures excluded)
   Also archived to /announcements on the site.
   Recipients (per team):
{chr(10).join(all_lines)}
--------------------------------------------------------

If anything looks wrong, reply here and we will follow up before the next round of comms.

----- Email 1 (Finalists) -----
Subject: {FINALIST_SUBJECT}

{FINALIST_TEXT}

----- Email 2 (All teams) -----
Subject: {ALL_TEAMS_SUBJECT}

{ALL_TEAMS_TEXT}
"""

    finalist_html_lines = "".join(
        f"<li><strong>{t['name']}:</strong> {', '.join(t['names']) if t['names'] else '(no member names)'} &lt;{', '.join(t['emails'])}&gt;</li>"
        for t in finalist_teams
    )
    all_html_lines = "".join(
        f"<li><strong>{t['name']}:</strong> {', '.join(t['emails'])}</li>"
        for t in all_teams
    )

    html_inner = f"""<p>Hi all,</p>
<p>The two case competition announcement emails went out today. Quick summary, then full bodies for your reference.</p>
<h3 style="margin-bottom:4px;">1) Finalist email</h3>
<p style="margin:2px 0;"><strong>Subject:</strong> {FINALIST_SUBJECT}</p>
<p style="margin:2px 0;"><strong>Sent:</strong> {finalist_success} team(s) succeeded, {finalist_failure} failed</p>
<p style="margin:2px 0;"><strong>Recipients (per team):</strong></p>
<ul>{finalist_html_lines}</ul>
<h3 style="margin-bottom:4px;">2) All-teams public results email</h3>
<p style="margin:2px 0;"><strong>Subject:</strong> {ALL_TEAMS_SUBJECT}</p>
<p style="margin:2px 0;"><strong>Sent:</strong> {all_success} team(s) succeeded, {all_failure} failed (Test Team fixtures excluded). Also archived to /announcements on the site.</p>
<p style="margin:2px 0;"><strong>Recipients (per team):</strong></p>
<ul>{all_html_lines}</ul>
<p>If anything looks wrong, reply here and we will follow up before the next round of comms.</p>
<hr>
<h3>Email 1 (Finalists)</h3>
<p><strong>Subject:</strong> {FINALIST_SUBJECT}</p>
{FINALIST_HTML_INNER}
<hr>
<h3>Email 2 (All teams)</h3>
<p><strong>Subject:</strong> {ALL_TEAMS_SUBJECT}</p>
{ALL_TEAMS_HTML_INNER}"""

    return text, html_inner


def main():
    env = load_env(ROOT / ".env")
    print(f"[announce] dry_run={DRY_RUN} admin={ADMIN_USER_ID}")

    finalist_id_set = ",".join(sql_quote(tid) for tid, _ in FINALIST_TEAM_IDS)
    finalist_teams = fetch_teams(f't.id IN ({finalist_id_set})')
    if len(finalist_teams) != len(FINALIST_TEAM_IDS):
        print(f"[announce] WARNING: expected {len(FINALIST_TEAM_IDS)} finalist teams, got {len(finalist_teams)}")

    all_teams = fetch_teams("t.status = 'COMPLETE' AND t.name NOT LIKE 'Test Team%'")

    print(f"[announce] FINALISTS: {len(finalist_teams)} teams, {sum(len(t['emails']) for t in finalist_teams)} addrs")
    for t in finalist_teams:
        print(f"  - {t['name']}: {', '.join(t['emails'])}")
    print(f"[announce] ALL_COMPLETE (excl. Test Team*): {len(all_teams)} teams, {sum(len(t['emails']) for t in all_teams)} addrs")
    for t in all_teams:
        print(f"  - {t['name']}: {', '.join(t['emails'])}")
    print(f"[announce] STAFF SUMMARY: 1 email to {len(STAFF_EMAILS)} addrs ({', '.join(STAFF_EMAILS)})")

    if DRY_RUN:
        print("[announce] dry-run, exiting before any DB writes or sends")
        return

    # Mark finalist teams BEFORE the FINALISTS broadcast
    for tid, name in FINALIST_TEAM_IDS:
        psql(
            f'UPDATE "Team" SET "isFinalist"=true, "finalistNotifiedAt"=NOW() '
            f'WHERE id={sql_quote(tid)};'
        )
    print(f"[announce] marked {len(FINALIST_TEAM_IDS)} teams as finalist")

    token = get_access_token(env)
    sender = env["GMAIL_SENDER_ADDRESS"]
    sender_name = env.get("GMAIL_SENDER_NAME", "")

    # 1. Finalist email (no archive)
    print("[announce] sending FINALIST email")
    finalist_html = wrap_html(FINALIST_HTML_INNER)
    f_success, f_failure = send_per_team_blast(
        token, sender, sender_name, env, "FINALISTS",
        FINALIST_SUBJECT, FINALIST_TEXT, finalist_html, finalist_teams,
        archive_as_announcement=False,
    )

    # Brief pause so finalists likely read theirs first
    if not DRY_RUN:
        print("[announce] sleeping 30s before all-teams blast...")
        time.sleep(30)

    # 2. All-teams email (archive on)
    print("[announce] sending ALL_COMPLETE email")
    all_html = wrap_html(ALL_TEAMS_HTML_INNER)
    a_success, a_failure = send_per_team_blast(
        token, sender, sender_name, env, "ALL_COMPLETE",
        ALL_TEAMS_SUBJECT, ALL_TEAMS_TEXT, all_html, all_teams,
        archive_as_announcement=True,
    )

    # 3. Staff summary (single send to 4 staff, no broadcast row)
    print("[announce] sending STAFF SUMMARY email")
    staff_text, staff_html_inner = build_staff_summary(
        finalist_teams, all_teams, f_success, f_failure, a_success, a_failure,
    )
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

    print(f"[announce] done. finalists: {f_success}/{f_success+f_failure}; all-teams: {a_success}/{a_success+a_failure}")


if __name__ == "__main__":
    main()
