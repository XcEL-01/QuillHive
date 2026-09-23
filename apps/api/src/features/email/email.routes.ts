import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../../middleware/validate";
import { checkEmail, verifyEmailUnsubscribeToken } from "./email.service";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const emailRouter = Router();

emailRouter.get("/check", validateQuery(z.object({ email: z.string().email().max(254) })), (req: any, res) => {
  return res.json(checkEmail(req.query.email));
});

async function unsubscribe(req: any, res: any) {
  const token = typeof req.query.token === "string" ? req.query.token : req.body?.token;
  const userId = typeof token === "string" ? verifyEmailUnsubscribeToken(token) : null;
  if (!userId) return res.status(400).send("Invalid unsubscribe link.");

  await db.update(usersTable)
    .set({ emailDigestEnabled: false, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  return res.type("html").send("<h1>You are unsubscribed</h1><p>Weekly QuillHive emails have been turned off for this account.</p>");
}

emailRouter.get("/unsubscribe", unsubscribe);
emailRouter.post("/unsubscribe", unsubscribe);