import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  delivered: boolean;
  provider: "gmail" | "dev-log";
  id?: string;
};

function fromAddress() {
  return process.env.GLAM_EMAIL_FROM ?? process.env.GLAM_GMAIL_USER ?? "Glam Studio";
}

let cachedTransporter: Transporter | null = null;

/**
 * Builds (and caches) a nodemailer transport over Gmail SMTP using an account + App
 * Password. Returns null when not configured, so callers can fall back to dev-log mode.
 * An App Password (not the account password) is required — generate one at
 * https://myaccount.google.com/apppasswords (requires 2-Step Verification enabled).
 */
function transporter(): Transporter | null {
  const user = process.env.GLAM_GMAIL_USER;
  const pass = process.env.GLAM_GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

/**
 * Sends an email via Gmail SMTP when GLAM_GMAIL_USER + GLAM_GMAIL_APP_PASSWORD are
 * configured, otherwise falls back to a dev logger that records the message without
 * sending. The verification code itself is NEVER logged here; callers pass already-
 * composed copy and the plaintext code only reaches the dev channel in non-production
 * (see routes/public-addons.ts).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transport = transporter();

  if (!transport) {
    logger.info(
      { to: input.to, subject: input.subject },
      "[email:dev-log] email not sent (no GLAM_GMAIL_USER / GLAM_GMAIL_APP_PASSWORD configured)",
    );
    return { delivered: false, provider: "dev-log" };
  }

  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
    return { delivered: true, provider: "gmail", id: info.messageId };
  } catch (error) {
    logger.error({ error, to: input.to }, "[email:gmail] send threw");
    return { delivered: false, provider: "gmail" };
  }
}

/** Masks an email for display/audit: jane.doe@gmail.com -> j••••e@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const first = local.slice(0, 1);
  const last = local.length > 1 ? local.slice(-1) : "";
  return `${first}••••${last}@${domain}`;
}
