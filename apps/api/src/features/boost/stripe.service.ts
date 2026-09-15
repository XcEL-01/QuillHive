import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("stripe_not_configured");
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PUBLISHABLE_KEY,
  );
}

export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? null;
}

export async function createBoostCheckoutSession(opts: {
  amountUsd: number;
  plan: string;
  planLabel: string;
  durationHours: number;
  postId: number;
  userId: number;
  boostRequestId: number;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");

  const stripe = getStripeClient();
  const metadata = {
    boostRequestId: String(opts.boostRequestId),
    postId: String(opts.postId),
    userId: String(opts.userId),
    plan: opts.plan,
    durationHours: String(opts.durationHours),
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    client_reference_id: `qh-boost-${opts.boostRequestId}`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(opts.amountUsd * 100),
        product_data: {
          name: opts.planLabel,
          description: `${opts.durationHours} hour QuillHive post boost for ${opts.customerName}`,
        },
      },
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");
  return getStripeClient().checkout.sessions.retrieve(sessionId);
}

export function constructStripeEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("stripe_not_configured");
  return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
}
