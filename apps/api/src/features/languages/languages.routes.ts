import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";
import { validateBody } from "../../middleware/validate";

const supportedLanguages = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "中文", direction: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
];

export const languagesRouter = Router();
export const userLanguageRouter = Router();

languagesRouter.get("/", (req, res) => {
  const accepted = req.headers["accept-language"] || "";
  const preferred = supportedLanguages.find(language => accepted.toString().toLowerCase().startsWith(language.code))?.code ?? "en";
  return res.json({ languages: supportedLanguages, fallback: "en", detected: preferred });
});

const langCodes = supportedLanguages.map(l => l.code) as [string, ...string[]];

userLanguageRouter.put("/language", requireAuth, validateBody(z.object({ lang: z.enum(langCodes) })), async (req: any, res) => {
  const [user] = await db
    .update(usersTable)
    .set({ lang: req.body.lang, updatedAt: new Date() })
    .where(eq(usersTable.id, req.currentUser.id))
    .returning();
  const { passwordHash: _, ...safeUser } = user;
  return res.json(safeUser);
});