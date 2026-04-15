# Product Requirements Document: Horizon Hobby Supply Chain Case Competition Platform

**Version:** 1.1  
**Date:** April 14, 2026  
**Author:** AV  
**Status:** Decisions Locked

---

## 1. Overview

### 1.1 Purpose

Build a web platform to host the Gies College of Business Supply Chain Management Case Competition in partnership with Horizon Hobby. The platform handles team registration, NDA execution, data distribution, submission collection, automated scoring, and leaderboard management for a two-week student forecasting competition.

### 1.2 Background

Horizon Hobby, the world's largest manufacturer and distributor of radio-controlled products, faces a dual inventory challenge: $5.2M in excess parts inventory and $2M in annual unfillable demand caused by inaccurate replacement part attach rate forecasting. This competition challenges student teams to build predictive models that improve attach rate accuracy for aftermarket parts, starting with one product line (LOSI 22S Sprint Car) and applying their model to a new product launch (LOSI 22S Dirt Oval).

### 1.3 Timeline

| Date | Milestone |
|------|-----------|
| April 17 (Fri) | Competition announced, website live |
| April 20 (Mon) | Kickoff briefing, data package distributed via platform |
| April 27 (Mon) | Follow-up Q&A session with Horizon Hobby |
| May 1 (Fri) | Submissions due (hard deadline) |
| May 2–3 (Sat–Sun) | Submission review and scoring |
| May 3 (Sun) EOD | Three finalist teams notified |
| May 7 (Thu) | Final presentations to Horizon Hobby, judging, winners announced |

### 1.4 Key Stakeholders

- **Competition Organizer (Admin):** AV and co-organizers — full platform control
- **Manager Role:** Sridhar and designated TAs — near-full access, cannot delete other admins
- **Horizon Hobby:** Provides competition brief, data, judging criteria, and serves as final judges on May 7
- **Student Teams:** 2-person teams from Gies College of Business

---

## 2. User Roles and Permissions

### 2.1 Role Hierarchy

| Role | Description |
|------|-------------|
| **Admin** | Full platform access. Can manage all users, upload/replace datasets, upload grading scripts, edit competition content, view all submissions, override scores, manage announcements, and promote users to Manager. |
| **Manager** | Can do everything Admin can except: delete Admin accounts, modify Admin permissions, or change platform configuration settings (e.g., deadline dates, NDA document). Can upload datasets, manage grading scripts, view submissions, post announcements, and manage student teams. |
| **Team Lead** | The student who registers the team. Can invite a teammate, sign NDA, download data, submit deliverables, and view team's own leaderboard position. |
| **Team Member** | Joins via invitation code. Same capabilities as Team Lead after joining: sign NDA, download data, submit deliverables, view team's leaderboard position. |

### 2.2 Authentication

- **Students:** Register with @illinois.edu email. Email verification via 6-digit code (not link). User enters the code on the verification screen to activate their account. Code expires after 15 minutes; user can request a resend. Password-based login with password reset flow (also code-based).
- **Admin/Manager:** Pre-created accounts with email/password. Admin can promote any registered user to Manager.

---

## 3. Feature Requirements

### 3.1 Public Landing Page

**Purpose:** Attract student interest, communicate the competition value proposition, and drive registration.

**Content and Design:**

- Hero section with full-bleed Horizon Hobby RC car imagery (use product photography from the LOSI Sprint Car line or similar surface category product). Overlay with competition title: "Supply Chain Management Case Competition 2026 — Presented by Horizon Hobby."
- Brief Horizon Hobby brand story (drawn from the competition brief): 40 years of innovation, world's largest RC manufacturer, headquartered in Champaign. Emphasize the local connection to the University of Illinois.
- Problem statement in accessible, compelling language: "Horizon Hobby sells world-class RC cars, planes, and boats. When customers need a replacement part, Horizon wants it to be available — but forecasting which parts will be needed and when is a challenge worth $7M+ annually. That's where you come in."
- Competition structure summary: teams of 2, build a predictive model, present to Horizon Hobby executives, cash prizes ($500 / $350 / $250).
- Visual timeline (interactive or static) showing the key dates from April 17 through May 7.
- Eligibility callout: must be a currently enrolled Gies College of Business student.
- Prominent "Register Your Team" CTA button.
- Links to Horizon Hobby websites (horizonhobby.com, towerhobbies.com) and the specific LOSI Sprint Car product page.
- Footer with contact email for competition questions.

**Non-logged-in visitors see:** Landing page, timeline, FAQ/announcements (read-only), and registration page only.

### 3.2 Team Registration Flow

**Step 1: Team Lead Registration**

- Team Lead visits registration page.
- Required fields: full name, @illinois.edu email, password (min 8 chars), team name.
- Checkbox (required): "I confirm that I am a currently enrolled student at Gies College of Business, University of Illinois Urbana-Champaign."
- Email verification: system sends a 6-digit verification code to the @illinois.edu address. User enters the code on the next screen. Code expires after 15 minutes with a "Resend Code" option. Account is not active until verified.
- Validation: reject non-@illinois.edu email addresses at the form level with a clear error message.

**Step 2: Team Member Invitation**

- After email verification and login, Team Lead is taken to a dashboard showing team status as "Incomplete — 1 of 2 members."
- Team Lead enters the teammate's @illinois.edu email address and clicks "Send Invitation."
- System generates a unique 6-character alphanumeric invitation code (e.g., "HH7K2M").
- System sends an email to the invitee containing: the invitation code, a brief description of the competition, and a link to the registration/join page.
- The Team Lead also sees the code on their dashboard so they can share it directly (in case the email is delayed or filtered).
- Invitation codes expire after 72 hours. Team Lead can regenerate if needed.

**Step 3: Team Member Joins**

- Invitee clicks the link in the email or navigates to the join page directly.
- Required fields: full name, @illinois.edu email (must match the email the invite was sent to), password, invitation code.
- Same Gies enrollment confirmation checkbox.
- On successful join, team status updates to "Complete — 2 of 2 members."
- Both team members receive a confirmation email.

**Constraints:**

- A team must have exactly 2 members. No solo registrations, no teams of 3+.
- A student can only be on one team. Attempting to register or join a second team is blocked with a clear message.
- Team name must be unique across all registrations.
- Registration closes at the submission deadline (May 1). Teams that haven't completed member joining by then are marked inactive.

### 3.3 NDA Execution Flow

**Purpose:** Before accessing the Horizon Hobby data, both team members must individually sign an NDA acknowledging the confidential nature of the data.

**Flow:**

1. After team is complete (2 members), dashboard shows "NDA Required" status.
2. Each team member clicks "Review and Sign NDA."
3. System displays the NDA as an embedded PDF viewer (scrollable, zoomable). The NDA document is uploaded by Admin via the admin panel.
4. Below the PDF viewer: a required text field labeled "Type your full legal name to acknowledge you have read and agree to the terms of this NDA."
5. The typed name must match (case-insensitive, trimmed) the name provided at registration. If it doesn't match, show an error: "The name you entered does not match your registered name."
6. A checkbox (required): "I have read the NDA in its entirety and agree to be bound by its terms."
7. Submit button: "Sign NDA."
8. On submission, system records: user ID, timestamp, IP address, typed name, and a hash of the NDA PDF (to track which version they signed).
9. Dashboard updates to show NDA status per member. Team cannot proceed to data download until both members have signed.

**Admin capabilities:** Admin/Manager can upload or replace the NDA PDF. If the NDA is updated after a team has signed, they are not required to re-sign (the hash records which version they agreed to). Admin can view a report of all NDA signatures with timestamps.

### 3.4 Data Download

**Purpose:** Distribute the competition dataset to teams that have completed registration and NDA signing.

**Availability:** Data download is enabled only after both team members have signed the NDA. Before that, the "Download Data" section shows a locked state with a message explaining the prerequisites.

**Data Package Contents (uploaded by Admin):**

- Competition brief document (the Horizon Hobby write-up, PDF or DOCX)
- Dataset files (Excel workbooks with Sprint Car GTM data, BOM, planned attach rates, actual bookings with three parts held back)
- 22S Dirt Oval forward-looking data
- Prediction template (Excel file with the required format for submitting predicted attach rates for the three held-back parts)
- Data dictionary / README file explaining all columns, definitions, and the held-back parts

**Implementation:**

- Admin uploads the data package as a ZIP file (or individual files) via the admin panel.
- Students see a download page listing each file with its name, description, size, and upload date.
- Each download is logged (who, when, which file) for audit purposes.
- Files are served over HTTPS. No direct public URLs — downloads require authentication and NDA verification.

### 3.5 Submission Portal

**Purpose:** Collect team deliverables before the May 1 deadline.

**Submission Interface — Separate Upload Areas:**

The submission page displays four distinct upload zones, one per component. Each zone has its own drag-and-drop area (or file picker button), upload status indicator, file name display, timestamp, and version history link. Teams upload each component independently — they do not need to submit everything at once.

**Submission Components:**

| Component | Format | Required | Description |
|-----------|--------|----------|-------------|
| Prediction File | .xlsx | Yes | Completed prediction template with monthly attach rate forecasts for the three held-back parts (12 months). This is the file scored by the auto-grader. |
| Code / Model Files | .py, .ipynb, .r, .zip | Yes | Code used to build the model. Can upload individual files (.py, .ipynb, .r) or a single ZIP archive containing all code. Multiple individual files allowed. |
| Written Methodology | .pdf | Yes | Document explaining the analytical approach, assumptions, data handling decisions, and model design. |
| Presentation | .pptx | Yes | PowerPoint deck as described in Horizon's deliverable requirements (current state analysis, data modeling, predictions, recommendations). |

**Submission Rules:**

- All four components must be uploaded for a submission to be considered complete.
- Teams may resubmit any individual component any number of times before the deadline. Each resubmission replaces the previous file for that component. The system retains full version history (all prior uploads stored), but only the latest version of each component is used for scoring and review.
- **Primary deadline:** May 1, 2026 at 11:59 PM Central Time. A countdown timer is visible on the submission page.
- **Grace period:** Submissions are accepted until May 2, 2026 at 2:00 AM Central Time (2-hour grace window). Submissions uploaded after 11:59 PM on May 1 are automatically flagged as "Late" in the system. Late submissions appear with a "LATE" badge on the admin review interface and the leaderboard. Admin/Manager can configure the grace period end time via the admin panel.
- **After grace period:** The upload interface is fully disabled. No further uploads are possible.
- Maximum file sizes: prediction file 10MB, code files 50MB total, methodology PDF 25MB, presentation PPTX 50MB.
- Format validation: reject files that don't match the required extensions. For the prediction file, validate that the Excel structure matches the template (correct sheet name, correct column headers, correct number of rows for the three parts × 12 months).

**Submission Confirmation:**

- On successful upload of each component, show a green checkmark with timestamp.
- When all four components are uploaded, show "Submission Complete" banner with a summary of all file names and upload timestamps.
- Send a confirmation email to both team members listing all submitted files and timestamps.

### 3.6 Automated Scoring and Leaderboard

**Scoring Mechanism:**

- Admin/Manager uploads a Python grading script via the admin panel. The script takes the prediction Excel file as input and outputs a weighted MAPE score.
- The grading script also requires an answer key file (the actual demand for the three held-back parts), uploaded separately by Admin. This file is never visible to students.
- When a team submits (or resubmits) their prediction file, the system executes the grading script against the submission and records the score.
- The grading script runs in a sandboxed environment (containerized) with no network access, limited memory and CPU, and a timeout (e.g., 60 seconds). This prevents malicious code execution.
- If the script fails (malformed input, runtime error), the submission is flagged and no score is recorded. The team sees a message: "Your prediction file could not be scored. Please verify it matches the required template format."
- Admin/Manager can re-run scoring on all submissions (e.g., after uploading a corrected grading script or answer key).

**Leaderboard:**

- Public leaderboard visible to all registered and logged-in teams.
- Displays: rank, team name, weighted MAPE score, submission timestamp, and a "LATE" badge if submitted after the primary deadline.
- Scoring is based on the **latest** prediction file submission (not the best). This encourages teams to be confident in their final submission.
- Updates in near-real-time as teams submit or resubmit.
- The leaderboard does not display scores for incomplete submissions (all four components required, but scoring uses only the prediction file).
- Admin can toggle leaderboard visibility (e.g., freeze it before finalist notification, or hide it entirely during the review period).
- Admin can toggle between "show all teams" and "show top N" modes.
- Admin/Manager can manually override or adjust a team's score if needed (with an audit log).

**Leaderboard Freeze:** Admin can freeze the leaderboard at a specified time (e.g., May 1 11:59 PM), after which scores are hidden from students until Admin unfreezes. This prevents teams from seeing final rankings before official notification.

### 3.7 Competition Progress and Timeline

**Purpose:** Keep teams oriented on where they are in the competition lifecycle.

**Implementation:**

- A visual timeline component (horizontal stepper or vertical timeline) displayed on the team dashboard and optionally on the public landing page.
- Each milestone shows: date, title, description, and status (upcoming / active / completed).
- The active stage is highlighted. Completed stages show a checkmark.
- Stages: Announced → Kickoff & Data Released → Q&A Session → Submissions Due → Review Period → Finalists Notified → Final Presentations.

### 3.8 Announcements, FAQ, and Broadcast Messaging

**Purpose:** Communicate updates, clarifications, and answers to common questions. Provide a broadcast channel for managers to reach all teams directly.

**Announcements:**

- Announcements section visible on the team dashboard (logged-in) and the public landing page (read-only).
- Admin/Manager can create, edit, and delete announcements. Each announcement has: title, body (rich text or markdown), optional file attachments, timestamp, and author.
- Announcements are displayed in reverse chronological order.
- Optional: email notification toggle — when Admin posts an announcement, optionally send an email blast to all registered teams.

**Broadcast Messaging:**

- Admin/Manager has a "Send Broadcast" feature in the admin panel.
- Compose a message with: subject line, body (rich text), and optional file attachments (up to 3 files, 25MB each — for sharing supplementary data, clarification documents, updated templates, etc.).
- Recipient options: all registered teams, all complete teams (NDA signed), finalist teams only, or a custom selection of teams.
- On send, every recipient receives the message via email. The message and attachments are also archived in the announcements section of the platform so students can access them later.
- Broadcast history is viewable in the admin panel with: message content, attachment list, recipient list, send timestamp, and delivery status.

**FAQ:**

- Dedicated FAQ page, content managed by Admin/Manager through a GUI editor.
- Supports adding, editing, reordering, and deleting Q&A pairs.
- Visible to both logged-in and public visitors.
- Can be updated at any time (e.g., after the April 27 Q&A session with Horizon).

### 3.9 Finalist Workflow

**Purpose:** After scoring and review (May 2–3), support the transition from competition phase to presentation phase for the top 3 teams.

**Implementation:**

- Admin/Manager marks three teams as "Finalists" in the admin panel.
- Finalist teams receive an email notification congratulating them and providing instructions for the May 7 presentation (location, time, format expectations).
- Finalist teams' dashboard updates to show "Finalist" status with presentation details.
- Finalists get a dedicated upload slot for a revised or final presentation (PPTX) for the May 7 presentation. This is separate from the original competition submission and does not affect their score. Upload is available from the moment they are marked as finalists through May 7.
- Non-finalist teams receive a thank-you email with their final score and rank.

---

## 4. Admin Panel

### 4.1 Dashboard

- Summary statistics: total registered teams, complete teams, NDAs signed, submissions received, submissions scored.
- Quick links to all admin functions.

### 4.2 User and Team Management

- View all registered users with: name, email, team name, role (lead/member), registration date, NDA status, submission status.
- Search and filter by any field.
- Ability to: deactivate a user/team, reset a user's password, remove a user from a team, manually mark NDA as signed (edge case handling).
- View team detail: both members, NDA status for each, all submitted files with timestamps and version history, current score.

### 4.3 Content Management

All content management is done through a GUI — no code or direct database edits required.

- **Competition Settings (GUI):** Edit competition dates and deadlines through a settings form: submission deadline (date and time), grace period end time, registration close date, leaderboard freeze time. All changes take effect immediately and are logged in the audit trail.
- **NDA Document:** Upload/replace the NDA PDF via drag-and-drop or file picker. View signing history with timestamps and names.
- **Data Package:** Upload/replace individual data files or a ZIP bundle via a file management interface. Add/edit file names and descriptions inline. Toggle data availability on/off (e.g., disable downloads before April 20 kickoff). Drag to reorder files in the student-facing download list.
- **Prediction Template:** Upload/replace the Excel template that teams download and fill in.
- **Answer Key:** Upload/replace the actual demand data for the three held-back parts. This file is used by the grading script and is never visible to students. Clearly labeled with a warning icon indicating it is confidential.
- **Grading Script:** Upload/replace the Python grading script. View execution logs. "Test Run" button to execute against a sample prediction file before deploying. "Re-score All" button to trigger re-scoring of all submissions after a script update.
- **Announcements:** Create, edit, delete via rich text editor with file attachment support. Toggle email blast per announcement.
- **FAQ:** Add, edit, delete, and reorder Q&A pairs through a GUI editor.
- **Timeline:** Edit milestone dates, titles, descriptions, and statuses through an inline editor. Changes reflect immediately on the student dashboard and landing page.

### 4.4 Submission Management

- View all team submissions in a table: team name, submission time, late status (badge), file list per component, score, status (complete/incomplete/error).
- Filter by: all submissions, on-time only, late only, scored, unscored, errors.
- Download any team's submitted files (individually or as a ZIP per team).
- Download all submissions as a bulk ZIP (organized by team folder).
- View grading script execution logs per submission (stdout, stderr, exit code).
- Manually trigger re-scoring for a single team or all teams.
- Override a team's score with a manual value (logged with reason).
- View submission version history per team per component (all prior uploads with timestamps).

### 4.5 Leaderboard Controls

- Toggle leaderboard visibility (visible / frozen / hidden).
- Set freeze time.
- Export leaderboard as CSV.

### 4.6 Broadcast Messaging

- **Compose:** Rich text editor with subject line. File attachment support (up to 3 files, 25MB each). Drag-and-drop or file picker for attachments.
- **Recipients:** Dropdown to select scope — "All registered teams," "All complete teams (NDA signed)," "Finalist teams only," or "Custom" (multi-select from team list).
- **Preview:** Before sending, Admin/Manager sees a preview of the email as recipients will see it, including attachment list and recipient count.
- **Send:** Confirmation dialog showing recipient count before sending. On send, emails are queued and delivered. Delivery status tracked per recipient.
- **History:** Table of all past broadcasts with: subject, sender, recipient scope, recipient count, sent timestamp, and delivery success rate. Click to view full message content and attachment list.
- **Attachments are also archived** in the announcements section so students who missed the email can access files from the platform.

### 4.7 Audit Log

- All admin and manager actions are logged: who, what, when.
- Includes: file uploads, user modifications, score overrides, announcement edits, leaderboard freezes.

---

## 5. Email Notifications

| Trigger | Recipients | Content |
|---------|-----------|---------|
| Team Lead registers | Team Lead | Welcome, 6-digit email verification code |
| Team invitation sent | Invitee | Invitation code, join link, competition overview |
| Team member joins | Both members | Team complete confirmation, next step (NDA) |
| NDA signed (both) | Both members | NDA confirmed, data download now available |
| Data package updated | All complete teams | Notification of updated data files |
| Submission component uploaded | Both members | Confirmation with component name, file name, and timestamp |
| All components complete | Both members | "Submission Complete" confirmation with full file list |
| Scoring complete | Both members | Score recorded, current leaderboard position |
| Scoring error | Both members | Prediction file could not be scored, check format |
| Announcement posted | All registered users (toggle) | Announcement content |
| Broadcast message sent | Selected recipients | Message content with file attachments |
| Deadline reminder (48hr) | Teams without complete submission | Reminder: 48 hours remaining |
| Deadline reminder (6hr) | Teams without complete submission | Urgent: 6 hours remaining |
| Deadline reminder (1hr) | Teams without complete submission | Final reminder: 1 hour remaining |
| Late submission received | Both members | Submission accepted but marked as late |
| Finalist selected | Finalist team | Congratulations, presentation details, upload slot open |
| Non-finalist notification | Non-finalist teams | Thank you, final score and rank |
| Password reset requested | Requesting user | 6-digit reset code |

---

## 6. Non-Functional Requirements

### 6.1 Security

- All traffic over HTTPS.
- Passwords hashed with bcrypt (min cost factor 12).
- Session tokens with 24-hour expiry.
- File uploads scanned for basic integrity (extension and MIME type match).
- Grading script executes in a sandboxed container with no network access, 256MB memory limit, and 60-second timeout.
- Data files served only to authenticated users with completed NDA. No direct/guessable URLs.
- CSRF protection on all forms.
- Rate limiting on login attempts (5 per minute per IP).

### 6.2 Performance

- Support up to 100 concurrent users (expected: 20–40 teams = 40–80 students).
- File uploads up to 50MB must complete within 60 seconds on typical university network.
- Leaderboard updates within 30 seconds of a successful scoring run.
- Page load times under 2 seconds for dashboard and leaderboard.

### 6.3 Availability

- Platform must be available from April 17 through May 7 without planned downtime.
- Hosted on reliable infrastructure (cloud provider — AWS, GCP, or similar).
- Daily backups of database and uploaded files.

### 6.4 Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions each).
- Mobile-responsive for landing page and dashboard (submission and admin panel may be desktop-optimized).

### 6.5 Accessibility

- WCAG 2.1 Level AA compliance for public-facing pages.
- All form fields labeled, error messages clear, keyboard navigable.

---

## 7. Data Model (Conceptual)

### Entities

- **User:** id, name, email, password_hash, role (admin/manager/student), created_at, email_verified, is_active
- **Team:** id, name, lead_user_id, status (incomplete/complete/active/finalist/inactive), created_at
- **TeamMembership:** id, team_id, user_id, role (lead/member), joined_at
- **Invitation:** id, team_id, invitee_email, code, created_at, expires_at, accepted_at, status (pending/accepted/expired)
- **NDASignature:** id, user_id, signed_at, typed_name, ip_address, nda_document_hash
- **DataFile:** id, filename, description, file_path, file_size, uploaded_by, uploaded_at, file_type (dataset/template/nda/answer_key/grading_script), is_active, display_order
- **Submission:** id, team_id, component_type (prediction/code/methodology/presentation), file_path, original_filename, file_size, uploaded_by, uploaded_at, version, is_latest, is_late
- **Score:** id, team_id, submission_id (prediction file), score_value (wMAPE), scored_at, script_version_hash, is_manual_override, override_reason
- **FinalistPresentation:** id, team_id, file_path, uploaded_by, uploaded_at, version
- **Announcement:** id, title, body, author_id, created_at, updated_at
- **BroadcastMessage:** id, subject, body, author_id, recipient_scope (all/complete/finalists/custom), created_at, sent_at, delivery_status
- **BroadcastAttachment:** id, broadcast_id, filename, file_path, file_size
- **BroadcastRecipient:** id, broadcast_id, team_id, delivered_at
- **FAQItem:** id, question, answer, display_order, created_at, updated_at
- **CompetitionSettings:** id, key, value, updated_by, updated_at (stores: submission_deadline, grace_period_end, registration_close, leaderboard_freeze_time, etc.)
- **AuditLog:** id, user_id, action, entity_type, entity_id, details_json, created_at

---

## 8. Tech Stack Recommendation

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| Frontend | Next.js (React) | Fast development, SSR for landing page SEO, component ecosystem |
| Backend/API | Next.js API routes or FastAPI (Python) | If grading integration is heavy, Python backend may simplify script execution |
| Database | PostgreSQL | Relational, robust, handles audit logs and complex queries |
| File Storage | AWS S3 or equivalent | Scalable, secure, pre-signed URLs for downloads |
| Email | SendGrid or AWS SES | Transactional emails, bulk announcement support |
| Grading Sandbox | Docker containers | Isolate student-submitted code from infrastructure |
| Hosting | AWS (EC2/ECS + RDS + S3) or Vercel (frontend) + Railway/Render (backend) | Balance cost and reliability for a 3-week lifespan |
| Auth | NextAuth.js or custom JWT | Simple email/password for this use case |

---

## 9. Decisions Log

All previously open questions have been resolved:

| Decision | Resolution |
|----------|-----------|
| Authentication method | Email/password with 6-digit verification code (not link). No SSO. |
| Submission resubmission | Multiple resubmissions allowed per component. Latest version scored and reviewed (not best). |
| Leaderboard visibility | Logged-in teams only. Shows latest score. |
| Submission deadline | Primary deadline May 1 11:59 PM CT. Grace period until May 2 2:00 AM CT — late submissions accepted but flagged with "LATE" badge. Grace period end time configurable by Admin. |
| Finalist revised presentation | Yes. Separate upload slot available from notification through May 7. |
| Notifications | Full notification suite: verification codes, submission confirmations, scoring results, deadline reminders (48hr, 6hr, 1hr), late submission alerts, finalist/non-finalist notifications. |
| Admin/Manager content editing | All content (deadlines, files, FAQ, timeline, announcements) editable through GUI — no code or DB access needed. |
| Broadcast messaging | Manager/Admin can compose and send messages with file attachments to all teams or selected recipients. Messages archived in announcements. |
| FAQ | Dedicated FAQ page with GUI editor for Admin/Manager. |
| NDA name matching | Soft match (case-insensitive, trimmed) with Admin override for edge cases. |
| Post-competition state | Archive mode (read-only) for 30 days, then decommission. |
| Grading script language | Python only. |
| Team dissolution | Not self-service. Requires Admin intervention. |
| Data watermarking | Not in v1. NDA is sufficient for a university competition. |
| File uploads | Separate upload zone per component (code, slides, report, prediction). Code files accept .py, .ipynb, .r, or .zip. |

---

## 10. Success Metrics

- 100% of registered teams complete the full flow (registration → NDA → data download) within 48 hours of kickoff
- Zero data access by non-NDA-signed users
- All submissions scored within 5 minutes of upload
- Zero support tickets related to registration or submission flow on competition day (May 1)

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low registration volume | Competition lacks competitive depth | Promote through Gies channels, faculty announcements, student orgs starting April 17 |
| Grading script failure on edge cases | Teams see scoring errors, lose confidence | Test grading script against intentionally malformed submissions before launch. Provide clear template validation. |
| Submission surge at deadline | Platform slowdown or timeouts at 11:59 PM May 1 | Rate limit uploads, queue scoring jobs, test under load |
| Data leak despite NDA | Horizon Hobby's confidential data exposed | NDA is legally binding; data access logged; no public URLs; small cohort reduces risk |
| Team member drops out | Team cannot complete with one person | Admin can manually remove member and allow a replacement invitation before deadline |
| University email delays | Verification and invitation emails delayed | Show invitation code on dashboard so Team Lead can share directly |

---

## 12. Milestones and Development Timeline

| Date | Deliverable |
|------|-------------|
| April 14–15 | PRD finalized, tech stack confirmed, development begins |
| April 16 | Landing page, registration flow, and team invitation flow complete |
| April 17 | **Website goes live.** Landing page, registration, and timeline visible. |
| April 18–19 | NDA flow, data download, admin panel (content upload), and announcement system |
| April 20 | **Kickoff.** Data download enabled. All student-facing features functional. |
| April 21–25 | Submission portal, automated scoring, leaderboard, email notifications |
| April 26 | Full end-to-end testing with sample submissions and grading script |
| April 27–30 | Bug fixes, monitoring, admin training |
| May 1 | **Submissions due.** Platform handles deadline traffic. |
| May 2–3 | Admin uses platform for review and finalist selection |
| May 7 | Finalist presentations. Post-competition archive mode. |
