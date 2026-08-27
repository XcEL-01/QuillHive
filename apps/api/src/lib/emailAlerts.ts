import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

export const ADMIN_EMAIL = process.env["OWNER_EMAIL"] || "careerevive@gmail.com";

let cachedTransporter: Transporter | null = null;
let configChecked = false;

function getTransporter(): Transporter | null {
  if (configChecked) return cachedTransporter;
  configChecked = true;

  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) {
    logger.info("Email alerts disabled (SMTP not configured)");
    return null;
  }
  try {
    cachedTransporter = nodemailer.createTransport({
      host,
      port: Number(process.env["SMTP_PORT"] || 587),
      secure: process.env["SMTP_SECURE"] === "true",
      auth: { user, pass },
    });
    logger.info("Email alerts configured");
    return cachedTransporter;
  } catch (err) {
    logger.warn({ err }, "Failed to create SMTP transporter");
    return null;
  }
}

export async function sendAlertEmail(subject: string, content: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: `"QuillHive Alerts" <${process.env["SMTP_USER"]}>`,
      to: ADMIN_EMAIL,
      subject: subject.slice(0, 150),
      text: content.slice(0, 8000),
    });
    return true;
  } catch (err) {
    logger.warn({ err }, "Failed to send alert email");
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASS"]);
}
