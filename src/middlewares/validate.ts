// middlewares/validate.ts
import { RequestHandler } from "express";
import { z, ZodError, ZodObject } from "zod";

export const validateZod = (schema: ZodObject<any>): RequestHandler => {
  return (req, res, next) => {
    const sources = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    // Try validation against each source (body, query, params) using the same schema
    // Only one must succeed (whichever contains the matching fields)
    let parsedData = null;
    let firstError = null;

    for (const [key, data] of Object.entries(sources)) {
      const result = schema.safeParse(data);
      if (result.success) {
        parsedData = result.data;
        req[key as keyof typeof sources] = parsedData;
        return next(); // ✅ Pass validation
      } else {
        firstError ??= result.error;
      }
    }

    const errors =
      firstError?.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })) ?? [];

    res.status(400).json({ success: false, errors });
    // Ensure the middleware returns void
    return;
  };
};
