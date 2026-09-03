import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { supportTicketsTable, supportMessagesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { validateBody } from "../../middleware/validate";
import { rateLimit } from "../../middleware/rateLimit";
import { logger } from "../../lib/logger";
import { notify } from "../notifications/notification.service";

export const publicSupportRouter = Router();

async function getSupportOwnerId(): Promise<number | null> {
  const [owner] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "super_admin")).limit(1);
  return owner?.id ?? null;
}

// Public-facing routes - banned/logged-out users must be able to submit appeals & DMCA notices.
// Rate-limit per IP: 3 submissions / hour.
const submissionLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  subject: z.string().min(1).max(180),
  message: z.string().min(5).max(2000),
  category: z.string().max(50).optional(),
});

publicSupportRouter.post(
  "/contact",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }),
  validateBody(contactSchema),
  async (req, res) => {
    try {
      const body = req.body as z.infer<typeof contactSchema>;
      const ownerId = await getSupportOwnerId();
      if (!ownerId) return res.status(503).json({ success: false, message: "Support is temporarily unavailable." });
      const [ticket] = await db
        .insert(supportTicketsTable)
        .values({
          userId: ownerId,
          subject: body.subject ?? body.message.slice(0, 120),
          category: body.category ?? "general",
          severity: "normal",
        })
        .returning();
      await db.insert(supportMessagesTable).values({
        ticketId: ticket.id,
        userId: ownerId,
        message: `Name: ${body.name}\nEmail: ${body.email}\nCategory: ${body.category ?? "general"}\n\n${body.message}`,
        fileId: null,
      });
      void notify({ userId: ownerId, type: "system", title: "New public contact message", message: `Contact request: ${body.subject ?? "General enquiry"}`, url: "/support" }).catch(() => {});
      logger.info({ contactEmail: body.email }, "Contact form submitted");
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Failed to record contact form");
      return res.status(500).json({ success: false, message: "Could not submit message." });
    }
  }
);

const appealSchema = z.object({
  username: z.string().min(1).max(64),
  email: z.string().email(),
  explanation: z.string().min(20).max(5000),
});

const dmcaSchema = z.object({
  copyrightedWork: z.string().min(5).max(2000),
  infringingUrl: z.string().url().max(2000),
  contactInfo: z.string().min(5).max(500),
  goodFaithStatement: z.literal(true),
});

publicSupportRouter.post(
  "/appeal",
  submissionLimit,
  validateBody(appealSchema),
  async (req, res) => {
    try {
      const body = req.body as z.infer<typeof appealSchema>;
      const ownerId = await getSupportOwnerId();
      if (!ownerId) return res.status(503).json({ success: false, message: "Support is temporarily unavailable." });
      const supportOwnerId = ownerId;
      const [ticket] = await db
        .insert(supportTicketsTable)
        .values({
          userId: ownerId,
          subject: `Appeal - ${body.username}`,
          category: "account",
          severity: "high",
        } as any)
        .returning();
      await db.insert(supportMessagesTable).values({
        ticketId: ticket.id,
        userId: ownerId,
        message: `APPEAL\nUsername: ${body.username}\nEmail: ${body.email}\n\n${body.explanation}`,
        fileId: null,
      } as any);
      logger.info({ appealUsername: body.username }, "Appeal submitted");
      void notify({ userId: supportOwnerId, type: "system", title: "New account appeal", message: `Appeal submitted for ${body.username}`, url: "/support" }).catch(() => {});
      return res.json({
        success: true,
        message: "Your appeal has been received. We will review it within 7 business days.",
      });
    } catch (err) {
      logger.error({ err }, "Failed to record appeal");
      return res.status(500).json({ success: false, message: "Could not record appeal." });
    }
  }
);

publicSupportRouter.post(
  "/dmca",
  submissionLimit,
  validateBody(dmcaSchema),
  async (req, res) => {
    try {
      const body = req.body as z.infer<typeof dmcaSchema>;
      const ownerId = await getSupportOwnerId();
      if (!ownerId) return res.status(503).json({ success: false, message: "Support is temporarily unavailable." });
      const supportOwnerId = ownerId;
      const [ticket] = await db
        .insert(supportTicketsTable)
        .values({
          userId: ownerId,
          subject: `DMCA - ${body.infringingUrl}`,
          category: "abuse",
          severity: "high",
        } as any)
        .returning();
      await db.insert(supportMessagesTable).values({
        ticketId: ticket.id,
        userId: ownerId,
        message: `DMCA TAKEDOWN\nWork: ${body.copyrightedWork}\nInfringing URL: ${body.infringingUrl}\nContact: ${body.contactInfo}\nGood-faith statement: confirmed`,
        fileId: null,
      } as any);
      logger.info({ infringingUrl: body.infringingUrl }, "DMCA submitted");
      void notify({ userId: supportOwnerId, type: "system", title: "New DMCA notice", message: "A public DMCA notice needs review.", url: "/support" }).catch(() => {});
      return res.json({
        success: true,
        message: "Your DMCA notice has been received and will be reviewed.",
      });
    } catch (err) {
      logger.error({ err }, "Failed to record DMCA");
      return res.status(500).json({ success: false, message: "Could not record DMCA notice." });
    }
  }
);
