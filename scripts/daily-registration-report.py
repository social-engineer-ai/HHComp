"""
Send a daily registration summary to the organizers.
Run via cron on EC2 at 6 PM CT daily.

Usage: python3 /opt/hh-comp/scripts/daily-registration-report.py
"""

import base64
import json
import os
import urllib.parse
import urllib.request
from email.message import EmailMessage
from datetime import datetime, timezone

# --- Config ---
RECIPIENTS = [
    "Sridhar@illinois.edu",
    "kolleri2@illinois.edu",
    "ashishk@illinois.edu",
]
DB_CONTAINER = "hh-postgres"
DB_USER = "hhcomp"
DB_NAME = "hhcomp"

# Gmail OAuth
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
REFRESH_TOKEN = os.environ.get("GMAIL_REFRESH_TOKEN", "")
SENDER = os.environ.get("GMAIL_SENDER_ADDRESS", "uiucbadm576@gmail.com")
SENDER_NAME = os.environ.get("GMAIL_SENDER_NAME", "Gies SCM Analytics Competition")


def run_sql(query: str) -> str:
    import subprocess
    result = subprocess.run(
        ["docker", "exec", DB_CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME, "-tA", "-c", query],
        capture_output=True, text=True, timeout=15,
    )
    return result.stdout.strip()


def get_access_token() -> str:
    data = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    return json.loads(urllib.request.urlopen(req).read())["access_token"]


def send_email(token: str, to: list, subject: str, html: str, text: str):
    msg = EmailMessage()
    msg["From"] = f"{SENDER_NAME} <{SENDER}>"
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    raw = base64.urlsafe_b64encode(bytes(msg)).decode("ascii")
    req = urllib.request.Request(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        data=json.dumps({"raw": raw}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req).read())
    print(f"Sent: id={res.get('id')}")


def main():
    total_teams = run_sql('SELECT COUNT(*) FROM "Team"')
    complete_teams = run_sql("SELECT COUNT(*) FROM \"Team\" WHERE status = 'COMPLETE'")
    incomplete_teams = run_sql("SELECT COUNT(*) FROM \"Team\" WHERE status = 'INCOMPLETE'")
    total_students = run_sql("SELECT COUNT(*) FROM \"User\" WHERE role = 'STUDENT'")
    nda_signed = run_sql('SELECT COUNT(DISTINCT "userId") FROM "NDASignature"')

    teams_detail = run_sql("""
        SELECT t.name || '|' || t.status || '|' || string_agg(u.name || ' (' || u.email || ')', '; ' ORDER BY m.role)
        FROM "Team" t
        JOIN "TeamMembership" m ON m."teamId" = t.id
        JOIN "User" u ON u.id = m."userId"
        WHERE u.role = 'STUDENT'
        GROUP BY t.id
        ORDER BY t."createdAt" DESC
    """)

    now = datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p UTC")

    rows_html = ""
    rows_text = ""
    for line in teams_detail.splitlines():
        if not line.strip():
            continue
        parts = line.split("|", 2)
        if len(parts) < 3:
            continue
        name, status, members = parts
        badge_color = "#16a34a" if status == "COMPLETE" else "#d97706"
        rows_html += f"""
        <tr>
            <td style="padding:8px; border-bottom:1px solid #eee;">{name}</td>
            <td style="padding:8px; border-bottom:1px solid #eee;">
                <span style="background:{badge_color}; color:white; padding:2px 8px; border-radius:10px; font-size:12px;">{status}</span>
            </td>
            <td style="padding:8px; border-bottom:1px solid #eee; font-size:13px;">{members}</td>
        </tr>
        """
        rows_text += f"  {name} [{status}] - {members}\n"

    subject = f"Registration update: {total_teams} teams, {total_students} students"

    html = f"""
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width:650px; margin:0 auto;">
        <div style="border-top:4px solid #E31837; padding:16px 0;">
            <h2 style="margin:0; font-size:18px;">Daily Registration Update</h2>
            <p style="margin:4px 0 0; color:#666; font-size:13px;">{now}</p>
        </div>

        <div style="display:flex; gap:16px; margin:20px 0;">
            <div style="flex:1; background:#f4f4f4; padding:16px; border-radius:8px; text-align:center;">
                <div style="font-size:28px; font-weight:bold;">{total_teams}</div>
                <div style="font-size:13px; color:#666;">Teams</div>
            </div>
            <div style="flex:1; background:#f4f4f4; padding:16px; border-radius:8px; text-align:center;">
                <div style="font-size:28px; font-weight:bold;">{complete_teams}</div>
                <div style="font-size:13px; color:#666;">Complete</div>
            </div>
            <div style="flex:1; background:#f4f4f4; padding:16px; border-radius:8px; text-align:center;">
                <div style="font-size:28px; font-weight:bold;">{total_students}</div>
                <div style="font-size:13px; color:#666;">Students</div>
            </div>
            <div style="flex:1; background:#f4f4f4; padding:16px; border-radius:8px; text-align:center;">
                <div style="font-size:28px; font-weight:bold;">{nda_signed}</div>
                <div style="font-size:13px; color:#666;">NDAs signed</div>
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr style="background:#f9f9f9;">
                <th style="padding:8px; text-align:left; border-bottom:2px solid #ddd;">Team</th>
                <th style="padding:8px; text-align:left; border-bottom:2px solid #ddd;">Status</th>
                <th style="padding:8px; text-align:left; border-bottom:2px solid #ddd;">Members</th>
            </tr>
            {rows_html}
        </table>

        <p style="margin-top:24px; font-size:12px; color:#999;">
            Supply Chain Analytics Competition 2026 | Gies College of Business x Horizon Hobby
        </p>
    </div>
    """

    text = f"""Daily Registration Update - {now}

Teams: {total_teams} ({complete_teams} complete, {incomplete_teams} incomplete)
Students: {total_students}
NDAs signed: {nda_signed}

Teams:
{rows_text}
---
Supply Chain Analytics Competition 2026 | Gies College of Business x Horizon Hobby
"""

    token = get_access_token()
    send_email(token, RECIPIENTS, subject, html, text)


if __name__ == "__main__":
    main()
