import { google } from "googleapis";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; mimeType: string }[];
};

function toArray(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function buildRawMessage(input: SendEmailInput): string {
  const sender = process.env.GMAIL_SENDER_ADDRESS!;
  const senderName = process.env.GMAIL_SENDER_NAME ?? "";
  const from = senderName ? `${senderName} <${sender}>` : sender;

  const boundary = `----=_Part_${Math.random().toString(36).slice(2)}`;
  const headers: string[] = [];
  headers.push(`From: ${from}`);
  headers.push(`To: ${toArray(input.to).join(", ")}`);
  if (input.cc?.length) headers.push(`Cc: ${toArray(input.cc).join(", ")}`);
  if (input.bcc?.length) headers.push(`Bcc: ${toArray(input.bcc).join(", ")}`);
  if (input.replyTo) headers.push(`Reply-To: ${input.replyTo}`);
  headers.push(`Subject: ${input.subject}`);
  headers.push("MIME-Version: 1.0");

  const hasAttachments = !!input.attachments?.length;

  let body = "";
  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    body += `\r\n--${boundary}\r\n`;
    body += `Content-Type: multipart/alternative; boundary="${boundary}_alt"\r\n\r\n`;
    body += `--${boundary}_alt\r\n`;
    body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n${input.text ?? stripTags(input.html)}\r\n`;
    body += `--${boundary}_alt\r\n`;
    body += `Content-Type: text/html; charset="UTF-8"\r\n\r\n${input.html}\r\n`;
    body += `--${boundary}_alt--\r\n`;
    for (const att of input.attachments!) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: ${att.mimeType}; name="${att.filename}"\r\n`;
      body += `Content-Transfer-Encoding: base64\r\n`;
      body += `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n`;
      body += att.content.toString("base64").replace(/(.{76})/g, "$1\r\n");
      body += `\r\n`;
    }
    body += `--${boundary}--`;
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body += `\r\n--${boundary}\r\n`;
    body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n${input.text ?? stripTags(input.html)}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Type: text/html; charset="UTF-8"\r\n\r\n${input.html}\r\n`;
    body += `--${boundary}--`;
  }

  return `${headers.join("\r\n")}\r\n${body}`;
}

function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function base64url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cachedGmail: ReturnType<typeof google.gmail> | null = null;
function getGmailClient() {
  if (cachedGmail) return cachedGmail;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  cachedGmail = google.gmail({ version: "v1", auth: oauth2 });
  return cachedGmail;
}

function logEmailToConsole(input: SendEmailInput, reason: string) {
  console.warn(`[email] ${reason}`);
  console.log("======= EMAIL (not sent — recoverable below) =======");
  console.log(`To:      ${toArray(input.to).join(", ")}`);
  console.log(`Subject: ${input.subject}`);
  console.log(`Body:`);
  console.log(input.text ?? stripTags(input.html));
  console.log("====================================================");
}

/**
 * Send email. NEVER throws — failures are logged to stdout so verification codes
 * and other critical content are recoverable from `docker compose logs app` while
 * Gmail is unconfigured. The flow that called us continues regardless.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const gmail = getGmailClient();
  if (!gmail) {
    logEmailToConsole(input, "Gmail not configured (GMAIL_REFRESH_TOKEN missing)");
    return;
  }
  try {
    const raw = buildRawMessage(input);
    const encoded = base64url(raw);
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });
  } catch (e) {
    logEmailToConsole(input, `Gmail send failed: ${(e as Error).message}`);
  }
}
