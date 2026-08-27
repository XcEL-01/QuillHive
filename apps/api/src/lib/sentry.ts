import type { Express, ErrorRequestHandler } from "express";
import { logger } from "./logger";

/**
 * Lightweight, dependency-free Sentry hook.
 *
 * If SENTRY_DSN is set AND @sentry/node is installed, errors are forwarded.
 * Otherwise this becomes a no-op that just logs through pino.
 *
 * Keeping the import dynamic means we don't force every dev environment
 * to install @sentry/node — production can opt in via env vars + install.
 */

type SentryLike = {
  init: (opts: { dsn: string; environment?: string; tracesSampleRate?: number }) => void;
  captureException: (err: unknown) => void;
};

let sentry: SentryLike | null = null;

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const mod = (await import(/* @vite-ignore */ "@sentry/node" as string)) as SentryLike;
    mod.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    sentry = mod;
    logger.info("Sentry initialized");
  } catch (err) {
    logger.warn({ err }, "SENTRY_DSN set but @sentry/node not installed; skipping");
  }
}

export function captureError(err: unknown): void {
  if (sentry) {
    try {
      sentry.captureException(err);
    } catch {
      /* swallow */
    }
  }
}

export function attachErrorHandler(app: Express): void {
  const handler: ErrorRequestHandler = (err, req, res, _next) => {
    logger.error({ err, url: req.url, method: req.method }, "unhandled_error");
    captureError(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(handler);
}
