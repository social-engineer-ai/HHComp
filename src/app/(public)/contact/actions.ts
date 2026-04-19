"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/client";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  message: z.string().min(10).max(5000),
});

const RECIPIENTS = [
  "ashishk@illinois.edu",
  "kolleri2@illinois.edu",
  "uiucbadm576@gmail.com",
];

export type ContactState = { error?: string; notice?: string };

export async function submitQueryAction(
  _prev: ContactState,
  fd: FormData
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    message: fd.get("message"),
  });
  if (!parsed.success)
    return { error: "Please fill in your name, email, and a message (at least 10 characters)." };

  const { name, email, message } = parsed.data;

  const rl = rateLimit(`contact:${email}`, 3, 15 * 60 * 1000);
  if (!rl.ok) return { error: "You've sent too many messages. Please try again in a few minutes." };

  // Send to organizers
  await sendEmail({
    to: RECIPIENTS,
    replyTo: email,
    subject: `[SCM Competition Query] from ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <hr style="border:none; border-top:1px solid #ddd; margin: 16px 0;" />
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr style="border:none; border-top:1px solid #ddd; margin: 16px 0;" />
        <p style="font-size: 12px; color: #888;">
          Submitted via the SCM Analytics Competition 2026 website.
          Reply directly to this email to respond to the sender.
        </p>
      </div>
    `,
    text: `From: ${name} <${email}>\n\n${message}\n\n---\nSubmitted via the SCM Analytics Competition 2026 website.`,
  });

  // Send receipt to the sender
  await sendEmail({
    to: email,
    subject: `We received your question, ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Hi ${name},</p>
        <p>Thanks for reaching out. We've received your message and will get back to you soon.</p>
        <p><strong>Your message:</strong></p>
        <blockquote style="border-left: 3px solid #ddd; padding-left: 12px; color: #555; margin: 12px 0;">
          ${message.replace(/\n/g, "<br>")}
        </blockquote>
        <p style="font-size: 13px; color: #666;">
          Supply Chain Analytics Competition 2026<br>
          Gies College of Business × Horizon Hobby
        </p>
      </div>
    `,
    text: `Hi ${name},\n\nThanks for reaching out. We've received your message and will get back to you soon.\n\nYour message:\n${message}\n\n---\nSupply Chain Analytics Competition 2026\nGies College of Business × Horizon Hobby`,
  });

  return { notice: "Your message has been sent. We'll get back to you soon." };
}
