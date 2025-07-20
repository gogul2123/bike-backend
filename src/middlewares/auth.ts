import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { JWTPayload } from "../types";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "Token not provided" });
  }

  try {
    const user = verifyToken(token) as JWTPayload;
    req.user = user; // Extend Express.Request type
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
