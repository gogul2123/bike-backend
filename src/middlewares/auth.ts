import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.ts";
import { JWTPayload } from "../types/index.ts";
import { envConfig } from "../config/env.ts";

// Make sure you have `cookie-parser` middleware applied in Express app
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.authToken;
  const role = req.cookies?.role;
  const userId = req.cookies?.userId;

  if (envConfig.nodeEnv === "development") {
    next();
    return;
  }

  if (!token || !role || !userId) {
    return res.status(404).json({ message: "Authentication data not found" });
  }

  try {
    const user = verifyToken(token) as JWTPayload;

    // Attach verified user info + role + userId to request
    req.user = {
      ...user,
      role,
      userId,
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
