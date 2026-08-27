import type { RequestHandler } from "express";
import { z } from "zod";

type RequestTarget = "body" | "query" | "params";

function formatErrors(error: z.ZodError) {
  return error.issues.map(issue => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validate(target: RequestTarget, schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request input", details: formatErrors(result.error) });
      return;
    }
    if (target === "query") {
      Object.assign(req.query, result.data);
    } else {
      (req as any)[target] = result.data;
    }
    next();
  };
}

export function validateBody(schema: z.ZodType): RequestHandler {
  return validate("body", schema);
}

export function validateQuery(schema: z.ZodType): RequestHandler {
  return validate("query", schema);
}

export function validateParams(schema: z.ZodType): RequestHandler {
  return validate("params", schema);
}