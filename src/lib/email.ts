import { Resend } from "resend"

let _resend: Resend | null = null
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured")
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = process.env.EMAIL_FROM || "LLMAtlas <noreply@llmatlas.app>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const APP_NAME = "LLMAtlas"

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Geist Sans',system-ui,sans-serif;color:#e6edf3">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:12px;border:1px solid #30363d;overflow:hidden">
      <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #30363d">
        <span style="font-size:22px;font-weight:700;background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">⬡ ${APP_NAME}</span>
      </td></tr>
      <tr><td style="padding:32px 40px">${body}</td></tr>
      <tr><td style="padding:20px 40px;border-top:1px solid #30363d;color:#8b949e;font-size:12px">
        You received this email from ${APP_NAME}. If you didn't request this, you can ignore it.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/verify-email?token=${token}`
  const body = `
    <h2 style="margin:0 0 16px;color:#e6edf3;font-size:20px">Verify your email address</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 24px">Click the button below to verify your email and activate your ${APP_NAME} account.</p>
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Verify Email Address</a>
    <p style="color:#8b949e;font-size:13px;margin:20px 0 0">This link expires in 24 hours. If you can't click the button, copy and paste this URL:</p>
    <p style="color:#58a6ff;font-size:12px;word-break:break-all;margin:8px 0 0">${url}</p>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Verify your email — ${APP_NAME}`,
    html: baseTemplate("Verify your email", body),
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  const body = `
    <h2 style="margin:0 0 16px;color:#e6edf3;font-size:20px">Reset your password</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 24px">We received a request to reset your ${APP_NAME} password. Click the button below to set a new password.</p>
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">Reset Password</a>
    <p style="color:#8b949e;font-size:13px;margin:20px 0 0">This link expires in <strong style="color:#e6edf3">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Reset your password — ${APP_NAME}`,
    html: baseTemplate("Reset your password", body),
  })
}

export async function sendNewLoginAlert(
  email: string,
  details: { device?: string; browser?: string; ipAddress?: string; time: string }
): Promise<void> {
  const body = `
    <h2 style="margin:0 0 16px;color:#e6edf3;font-size:20px">New sign-in detected</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 20px">Your ${APP_NAME} account was just accessed from a new location.</p>
    <table style="background:#0d1117;border-radius:8px;padding:16px;width:100%;border-collapse:collapse">
      <tr><td style="color:#8b949e;font-size:13px;padding:6px 0">Time</td><td style="color:#e6edf3;font-size:13px;padding:6px 0">${details.time}</td></tr>
      ${details.browser ? `<tr><td style="color:#8b949e;font-size:13px;padding:6px 0">Browser</td><td style="color:#e6edf3;font-size:13px;padding:6px 0">${details.browser}</td></tr>` : ""}
      ${details.device ? `<tr><td style="color:#8b949e;font-size:13px;padding:6px 0">Device</td><td style="color:#e6edf3;font-size:13px;padding:6px 0">${details.device}</td></tr>` : ""}
      ${details.ipAddress ? `<tr><td style="color:#8b949e;font-size:13px;padding:6px 0">IP Address</td><td style="color:#e6edf3;font-size:13px;padding:6px 0">${details.ipAddress}</td></tr>` : ""}
    </table>
    <p style="color:#8b949e;font-size:13px;margin:20px 0 0">If this was you, no action is needed. If you don't recognize this activity, <a href="${APP_URL}/settings/security" style="color:#58a6ff">secure your account immediately</a>.</p>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `New sign-in to your ${APP_NAME} account`,
    html: baseTemplate("New sign-in detected", body),
  })
}

export async function sendPasswordChangedAlert(email: string): Promise<void> {
  const body = `
    <h2 style="margin:0 0 16px;color:#e6edf3;font-size:20px">Password changed</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 20px">Your ${APP_NAME} account password was recently changed.</p>
    <p style="color:#8b949e;font-size:13px;margin:0">If you made this change, no action is needed. If you didn't, <a href="${APP_URL}/auth/forgot-password" style="color:#58a6ff">reset your password immediately</a>.</p>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your ${APP_NAME} password was changed`,
    html: baseTemplate("Password changed", body),
  })
}
