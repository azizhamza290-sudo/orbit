/**
 * Transactional email via Resend's HTTP API (no SDK dependency).
 * In development, when RESEND_API_KEY is missing, emails are logged
 * to the server console so the full flow remains testable.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = process.env.EMAIL_FROM || "Orbit <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n📧 [email:dev] To: ${to}\n   Subject: ${subject}\n`);
    return { delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    console.error("[email] send failed:", await res.text());
    return { delivered: false };
  }
  return { delivered: true };
}

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b0d12;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#12151d;border:1px solid #232838;border-radius:16px;padding:40px;">
    <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">◐ Orbit</div>
    <h1 style="font-size:18px;color:#e7eaf2;font-weight:600;">${title}</h1>
    <p style="color:#9aa3b5;font-size:14px;line-height:1.6;">${body}</p>
    ${
      cta
        ? `<a href="${cta.href}" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">${cta.label}</a>
           <p style="color:#5b6478;font-size:12px;margin-top:24px;word-break:break-all;">${cta.href}</p>`
        : ""
    }
    <p style="color:#5b6478;font-size:12px;margin-top:32px;">Orbit is free, open-source and ad-free. If you didn't request this, you can ignore this email.</p>
  </div>
</body></html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Verify your Orbit account",
    html: layout(
      "Confirm your email",
      "Welcome aboard! Confirm this email address to activate your Orbit account. The link expires in 24 hours.",
      { href: url, label: "Verify email" },
    ),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Reset your Orbit password",
    html: layout(
      "Reset your password",
      "We received a request to reset your password. The link expires in 1 hour.",
      { href: url, label: "Choose a new password" },
    ),
  });
}

export async function sendWorkspaceInviteEmail(
  email: string,
  workspaceName: string,
  inviterName: string,
  token: string,
) {
  const url = `${APP_URL}/invite/${token}`;
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${workspaceName} on Orbit`,
    html: layout(
      `Join ${workspaceName}`,
      `<strong>${inviterName}</strong> invited you to collaborate in <strong>${workspaceName}</strong>. Orbit is free — no plans, no ads.`,
      { href: url, label: "Accept invitation" },
    ),
  });
}
