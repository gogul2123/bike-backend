import { Request, Response, NextFunction } from "express";
import { envConfig } from "../config/env.ts";

// Accept roles as parameter

const allowedRoles = ["admin"];

export function authorizeRoles() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // comes from authenticateToken

    if (envConfig.nodeEnv === "development") {
      next();
      return;
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}
