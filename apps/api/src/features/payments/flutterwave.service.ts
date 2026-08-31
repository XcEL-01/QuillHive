import { createHmac } from "crypto";
import { logger } from "../../lib/logger";

// Support both naming conventions - FLW_ (short) and FLUTTERWAVE_ (full)
const FLW_SECRET =
  process.env["FLUTTERWAVE_SECRET_KEY"] ?? process.env["FLW_SECRET_KEY"];
const FLW_PUBLIC =
  process.env["FLUTTERWAVE_PUBLIC_KEY"] ?? process.env["FLW_PUBLIC_KEY"];
const FLW_ENC =
  process.env["FLUTTERWAVE_ENCRYPTION_KEY"] ??
  process.env["FLW_ENCRYPTION_KEY"];

const BASE = "https://api.flutterwave.com/v3";

export type Currency = "USD" | "NGN" | "GHS" | "KES" | "ZAR" | "UGX" | "TZS" | "RWF" | "GBP" | "EUR";

export interface InitiatePaymentOpts {
  amount: number;
  currency: Currency;
  email: string;
  name: string;
  userId: number;
  txRef: string;
  redirectUrl: string;
  meta?: Record<string, string | number>;
  description?: string;
}

export interface VerifyResult {
  success: boolean;
  amount: number;
  currency: string;
  status: string;
  txRef: string;
  flwRef: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  raw?: unknown;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${FLW_SECRET}`,
  };
}

export function isConfigured(): boolean {
  return !!(FLW_SECRET && FLW_PUBLIC && FLW_ENC);
}

export async function initiatePayment(opts: InitiatePaymentOpts): Promise<{ link: string; txRef: string }> {
  if (!isConfigured()) throw new Error("flutterwave_not_configured");
  const body = {
    tx_ref: opts.txRef,
    amount: opts.amount,
    currency: opts.currency,
    redirect_url: opts.redirectUrl,
    customer: { email: opts.email, name: opts.name },
    meta: { user_id: opts.userId, ...(opts.meta ?? {}) },
    customizations: {
      title: "QuillHive",
      description: opts.description ?? "QuillHive Creator Platform",
      logo: process.env["PUBLIC_APP_URL"]
        ? `${process.env["PUBLIC_APP_URL"]}/quillhive-icon.png`
        : undefined,
    },
  };

  const res = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error({ err, txRef: opts.txRef }, "flutterwave_initiate_failed");
    throw new Error(`flutterwave_initiate_failed_${res.status}`);
  }
  const json = (await res.json()) as { status: string; data?: { link: string } };
  if (json.status !== "success" || !json.data?.link) {
    throw new Error("flutterwave_no_link");
  }
  return { link: json.data.link, txRef: opts.txRef };
}

export async function verifyTransaction(transactionId: string): Promise<VerifyResult> {
  if (!isConfigured()) throw new Error("flutterwave_not_configured");
  const res = await fetch(`${BASE}/transactions/${transactionId}/verify`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`flutterwave_verify_failed_${res.status}`);
  const json = (await res.json()) as {
    status: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      tx_ref: string;
      flw_ref: string;
      customer?: { id?: string; email?: string; name?: string };
    };
  };
  const d = json.data;
  return {
    success: json.status === "success" && d?.status === "successful",
    amount: d?.amount ?? 0,
    currency: d?.currency ?? "",
    status: d?.status ?? "unknown",
    txRef: d?.tx_ref ?? "",
    flwRef: d?.flw_ref ?? "",
    customerEmail: d?.customer?.email,
    customerName: d?.customer?.name,
    raw: json,
  };
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!FLW_SECRET) return false;
  const hash = createHmac("sha256", FLW_SECRET).update(payload).digest("hex");
  return hash === signature;
}
