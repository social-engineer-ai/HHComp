/**
 * Email templates. Each function returns { subject, html, text }.
 * Keep styles inline — Gmail strips <style> blocks in many clients.
 */

const wrap = (body: string) => `
<div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.55;">
  <div style="border-top: 4px solid #E31837; padding: 24px 0; border-bottom: 1px solid #eee; margin-bottom: 24px;">
    <h1 style="margin:0; font-size: 20px; letter-spacing: -0.01em;">Supply Chain Analytics Competition 2026</h1>
    <p style="margin: 4px 0 0; color:#666; font-size: 13px;">Gies College of Business × Horizon Hobby</p>
  </div>
  ${body}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color:#888; font-size: 12px;">
    If you did not expect this email, you can safely ignore it.
  </div>
</div>
`;

export const emailTemplates = {
  verificationCode: (args: { code: string; name: string }) => ({
    subject: `Verify your email, code ${args.code}`,
    html: wrap(`
      <p>Hi ${escapeHtml(args.name)},</p>
      <p>Use the 6-digit code below to verify your email and activate your account:</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; background:#f4f4f4; padding: 12px 18px; display:inline-block; border-radius: 6px;">${args.code}</p>
      <p>This code expires in 15 minutes.</p>
    `),
    text: `Hi ${args.name},\n\nYour verification code is: ${args.code}\n\nThis code expires in 15 minutes.`,
  }),

  passwordResetCode: (args: { code: string; name: string; resetUrl: string }) => ({
    subject: `Password reset code: ${args.code}`,
    html: wrap(`
      <p>Hi ${escapeHtml(args.name)},</p>
      <p>You requested a password reset. Use this 6-digit code on the reset page:</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; background:#f4f4f4; padding: 12px 18px; display:inline-block; border-radius: 6px;">${args.code}</p>
      <p><a href="${args.resetUrl}" style="display:inline-block; margin-top:8px; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Reset your password</a></p>
      <p style="font-size:13px; color:#555;">This code expires in 15 minutes. If you didn't request this, you can ignore this email — your password will not change.</p>
    `),
    text: `Hi ${args.name},\n\nPassword reset code: ${args.code}\nReset link: ${args.resetUrl}\n\nThis code expires in 15 minutes. Ignore this email if you didn't request a reset.`,
  }),

  teamInvitation: (args: {
    teamName: string;
    leadName: string;
    code: string;
    joinUrl: string;
  }) => ({
    subject: `You've been invited to join team "${args.teamName}"`,
    html: wrap(`
      <p>Hi,</p>
      <p><strong>${escapeHtml(args.leadName)}</strong> has invited you to join their team <strong>${escapeHtml(args.teamName)}</strong> for the 2026 Supply Chain Analytics Competition, presented by Horizon Hobby.</p>
      <p>Your invitation code:</p>
      <p style="font-size: 22px; letter-spacing: 4px; font-weight: 700; background:#f4f4f4; padding: 10px 16px; display:inline-block; border-radius: 6px;">${args.code}</p>
      <p><a href="${args.joinUrl}" style="display:inline-block; margin-top:12px; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Join the team</a></p>
      <p>This invitation expires in 72 hours. You must be a currently enrolled Gies College of Business student to participate.</p>
    `),
    text: `You've been invited to join team "${args.teamName}" by ${args.leadName}.\n\nInvitation code: ${args.code}\nJoin: ${args.joinUrl}\n\nExpires in 72 hours.`,
  }),

  welcomeTeamLead: (args: { name: string; loginUrl: string }) => ({
    subject: `Welcome to the 2026 Supply Chain Analytics Competition`,
    html: wrap(`
      <p>Welcome to the 2026 Supply Chain Analytics Competition, presented by Horizon Hobby!</p>
      <p>Hi ${escapeHtml(args.name)}, your account is verified and your team has been created. Here's what to do next:</p>
      <ol>
        <li>Log in to your dashboard and invite your teammate using their @illinois.edu email</li>
        <li>Once your teammate joins, both members should sign the NDA from the dashboard</li>
        <li>We will send a notification when the competition data is available for download</li>
      </ol>
      <p><a href="${args.loginUrl}" style="display:inline-block; margin-top:8px; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Go to dashboard</a></p>
      <p>If you have any questions, reply to this email or contact uiucbadm576@gmail.com.</p>
    `),
    text: `Welcome to the 2026 Supply Chain Analytics Competition, presented by Horizon Hobby!\n\nHi ${args.name}, your account is verified and your team has been created.\n\nNext steps:\n1. Log in to your dashboard and invite your teammate using their @illinois.edu email\n2. Once your teammate joins, both members should sign the NDA from the dashboard\n3. We will send a notification when the competition data is available for download\n\nDashboard: ${args.loginUrl}\n\nQuestions? Contact uiucbadm576@gmail.com`,
  }),

  welcomeTeamMember: (args: { name: string; teamName: string; loginUrl: string }) => ({
    subject: `Welcome to the 2026 Supply Chain Analytics Competition`,
    html: wrap(`
      <p>Welcome to the 2026 Supply Chain Analytics Competition, presented by Horizon Hobby!</p>
      <p>Hi ${escapeHtml(args.name)}, your account is verified and you've joined team <strong>${escapeHtml(args.teamName)}</strong>. Here's what to do next:</p>
      <ol>
        <li>Sign the NDA from your dashboard if you haven't already</li>
        <li>We will send a notification when the competition data is available for download</li>
      </ol>
      <p><a href="${args.loginUrl}" style="display:inline-block; margin-top:8px; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Go to dashboard</a></p>
      <p>If you have any questions, reply to this email or contact uiucbadm576@gmail.com.</p>
    `),
    text: `Welcome to the 2026 Supply Chain Analytics Competition, presented by Horizon Hobby!\n\nHi ${args.name}, your account is verified and you've joined team "${args.teamName}".\n\nNext steps:\n1. Sign the NDA from your dashboard if you haven't already\n2. We will send a notification when the competition data is available for download\n\nDashboard: ${args.loginUrl}\n\nQuestions? Contact uiucbadm576@gmail.com`,
  }),

  teamComplete: (args: { teamName: string; loginUrl: string }) => ({
    subject: `Team "${args.teamName}" is now complete`,
    html: wrap(`
      <p>Great news! Your team <strong>${escapeHtml(args.teamName)}</strong> is now complete with 2 members.</p>
      <p>Next steps:</p>
      <ol>
        <li>Both members should sign the NDA from the dashboard if you haven't already</li>
        <li>We will send a notification when the competition data is available for download</li>
      </ol>
      <p><a href="${args.loginUrl}" style="display:inline-block; margin-top:8px; padding: 12px 24px; background:#E31837; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Go to dashboard</a></p>
    `),
    text: `Great news! Your team "${args.teamName}" is now complete with 2 members.\n\nNext steps:\n1. Both members should sign the NDA from the dashboard if you haven't already\n2. We will send a notification when the competition data is available for download\n\nDashboard: ${args.loginUrl}`,
  }),

  ndaConfirmed: (args: { teamName: string }) => ({
    subject: `NDA confirmed, data download available`,
    html: wrap(`
      <p>Both members of team <strong>${escapeHtml(args.teamName)}</strong> have signed the NDA.</p>
      <p>You can now download the competition data package from your dashboard.</p>
    `),
    text: `NDA confirmed for team "${args.teamName}". Data download is now available.`,
  }),

  submissionComponentUploaded: (args: {
    teamName: string;
    component: string;
    filename: string;
    when: string;
  }) => ({
    subject: `Submission received: ${args.component}`,
    html: wrap(`
      <p>We received a <strong>${args.component}</strong> upload for team <strong>${escapeHtml(args.teamName)}</strong>:</p>
      <p><code>${escapeHtml(args.filename)}</code> at ${args.when}</p>
    `),
    text: `Received ${args.component} for team ${args.teamName}: ${args.filename} at ${args.when}.`,
  }),

  submissionComplete: (args: { teamName: string; components: string[] }) => ({
    subject: `All four components received, submission complete`,
    html: wrap(`
      <p>Your team <strong>${escapeHtml(args.teamName)}</strong> has uploaded all four submission components:</p>
      <ul>${args.components.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
      <p>You can still replace any component before the May 1 deadline; the latest version is what gets scored.</p>
    `),
    text: `Submission complete for team ${args.teamName}. Components: ${args.components.join(", ")}`,
  }),

  scoreRecorded: (args: { teamName: string; score: number; rank?: number }) => ({
    subject: `Scoring complete, wMAPE ${args.score.toFixed(4)}`,
    html: wrap(`
      <p>Your latest submission for team <strong>${escapeHtml(args.teamName)}</strong> has been scored.</p>
      <p><strong>Weighted MAPE:</strong> ${args.score.toFixed(4)}</p>
      ${args.rank ? `<p><strong>Current rank:</strong> #${args.rank}</p>` : ""}
    `),
    text: `Score recorded for team ${args.teamName}: wMAPE ${args.score.toFixed(4)}${args.rank ? ` (rank #${args.rank})` : ""}`,
  }),

  scoringError: (args: { teamName: string; message: string }) => ({
    subject: `Scoring failed, please check your file`,
    html: wrap(`
      <p>We could not score your latest prediction file for team <strong>${escapeHtml(args.teamName)}</strong>.</p>
      <p><strong>Reason:</strong> ${escapeHtml(args.message)}</p>
      <p>Please verify the file matches the template format and resubmit.</p>
    `),
    text: `Scoring failed for team ${args.teamName}: ${args.message}`,
  }),

  deadlineReminder: (args: { teamName: string; hoursLeft: number }) => ({
    subject: `Submission deadline reminder: ${args.hoursLeft} hour${args.hoursLeft === 1 ? "" : "s"} left`,
    html: wrap(`
      <p>Reminder for team <strong>${escapeHtml(args.teamName)}</strong>: the submission deadline is in <strong>${args.hoursLeft} hour${args.hoursLeft === 1 ? "" : "s"}</strong>.</p>
      <p>If you haven't completed all four components, please do so before Friday May 1, 11:59 PM Central.</p>
    `),
    text: `Deadline reminder: ${args.hoursLeft} hour(s) left for team ${args.teamName}.`,
  }),

  lateSubmissionNotice: (args: { teamName: string; component: string }) => ({
    subject: `Late submission accepted: ${args.component}`,
    html: wrap(`
      <p>Your <strong>${args.component}</strong> upload for team <strong>${escapeHtml(args.teamName)}</strong> was received after the primary deadline (May 1, 11:59 PM Central).</p>
      <p>It has been accepted as a <strong>late submission</strong> and will be flagged accordingly.</p>
    `),
    text: `Late submission accepted for team ${args.teamName}: ${args.component}`,
  }),

  finalistSelected: (args: { teamName: string; presentationInfo: string }) => ({
    subject: `Congratulations, you're a finalist!`,
    html: wrap(`
      <p>Congratulations, team <strong>${escapeHtml(args.teamName)}</strong>. You are a finalist for the 2026 Horizon Hobby × Gies Supply Chain Analytics Competition.</p>
      <p><strong>Presentation details:</strong></p>
      <div>${args.presentationInfo}</div>
      <p>A dedicated upload slot for your final presentation is now available on your dashboard.</p>
    `),
    text: `Congratulations team ${args.teamName}, you are a finalist. ${args.presentationInfo}`,
  }),

  nonFinalistNotice: (args: { teamName: string; finalRank: number; finalScore: number }) => ({
    subject: `Thank you for competing`,
    html: wrap(`
      <p>Thank you for your hard work on the 2026 Supply Chain Analytics Competition.</p>
      <p>Your team <strong>${escapeHtml(args.teamName)}</strong> finished at rank <strong>#${args.finalRank}</strong> with a weighted MAPE of <strong>${args.finalScore.toFixed(4)}</strong>.</p>
      <p>Final presentations will be held May 7 with the top 3 teams. We appreciate your effort and hope you learned a lot.</p>
    `),
    text: `Thank you team ${args.teamName}. Final rank: #${args.finalRank}, wMAPE ${args.finalScore.toFixed(4)}.`,
  }),
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
