// utils/jwt.ts
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types";
import { envConfig } from "../config/env";

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, envConfig.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, envConfig.jwtSecret) as JWTPayload;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}