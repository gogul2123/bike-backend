// modules/auth/otp.controller.ts
import { Request, Response } from "express";
import { generateToken } from "../../utils/jwt.ts";
import { sendOtp, verifyOtp } from "./otp.service.ts";
import { getOrCreateUser } from "../user/user.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";
import { envConfig } from "../../config/env.ts";

export async function sendOtpHandler(req: Request, res: Response) {
  const { mobile } = req.body;
  if (!mobile) sendError(res, 400, "Missing mobile");
  const otp = await sendOtp(mobile);
  if (envConfig.nodeEnv === "development") {
    console.log(`OTP for ${mobile}: ${otp}`);
    sendSuccess(res, { otp }, "OTP sent successfully (development mode)");
    return;
  }
  sendSuccess(res, {}, "OTP sent successfully");
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    sendError(res, 400, "Missing params");
  }
  const valid = await verifyOtp(mobile, otp);
  if (!valid) {
    sendError(res, 400, "Invalid OTP");
    return;
  }
  const user = await getOrCreateUser(mobile);
  const token = generateToken({ userId: user.userId, mobile, role: user.role });
  sendSuccess(res, { token, user });
}
