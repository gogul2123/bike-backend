import { Request, Response, NextFunction } from "express";

// Extend Express Request to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: { [key: string]: any };
}

export function preprocessBikeFields(
  req: MulterRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.body) req.body = {};

    // Convert availability to boolean
    if ("availability" in req.body) {
      req.body.availability = req.body.availability === "true";
    }

    if ("weekendVariation" in req.body) {
      req.body.weekendVariation = Number(req.body.weekendVariation);
    }

    // Convert price to number
    if ("price" in req.body) {
      req.body.price = Number(req.body.price);
    }

    // Convert bikes JSON string to array
    if ("bikes" in req.body) {
      try {
        req.body.bikes = JSON.parse(req.body.bikes);
      } catch (err) {
        res.status(400).json({ error: "Invalid bikes array format" });
        return; // ✅ exit middleware without returning the res object
      }
    }

    // Attach file object for Zod validation
    if (req.file) {
      req.body.imageFile = req.file;
    }

    next(); // continue to next middleware
  } catch (err) {
    res.status(400).json({ error: "Invalid input data" });
    return; // ✅ exit without returning Response
  }
}
