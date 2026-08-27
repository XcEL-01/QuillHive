import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../../middleware/validate";
import { checkEmail } from "./email.service";

export const emailRouter = Router();

emailRouter.get("/check", validateQuery(z.object({ email: z.string().email().max(254) })), (req: any, res) => {
  return res.json(checkEmail(req.query.email));
});