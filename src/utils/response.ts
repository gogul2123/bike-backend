// utils/response.ts
import { Response } from "express";

export function sendSuccess(
  res: Response,
  data: any = {},
  message = "Success"
) {
  if (data) {
    return res.status(200).json({ success: true, message, data });
  }
  return res.status(200).json({ success: true, message });
}

export function sendError(
  res: Response,
  statusCode = 500,
  message = "Internal Server Error",
  data: any = {}
) {
  return res.status(statusCode).json({ success: false, message, ...data });
}
