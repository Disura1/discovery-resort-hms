import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null; // falls back to console logging — see sendMail below
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const client = getTransporter();

  if (!client) {
    // No SMTP configured (typical in local development/testing): log instead
    // of silently failing, so the OTP/magic-link flow can still be exercised.
    logger.info({ to, subject, text }, "SMTP not configured — logging email instead of sending");
    return;
  }

  await client.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
}
