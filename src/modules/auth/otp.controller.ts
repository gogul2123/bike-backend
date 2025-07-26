// modules/auth/otp.controller.ts
import { Request, Response } from "express";
import { generateToken } from "../../utils/jwt.ts";
import { sendOtp, verifyOtp } from "./otp.service.ts";
import { getOrCreateUser } from "../user/user.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";
import { envConfig } from "../../config/env.ts";

export async function sendOtpHandler(req: Request, res: Response) {
  try {
    const { mobile } = req.body;
    const otp = await sendOtp(mobile);
    if (envConfig.nodeEnv === "development") {
      console.log(`OTP for ${mobile}: ${otp}`);
      sendSuccess(res, { otp }, "OTP sent successfully (development mode)");
      return;
    }
    sendSuccess(res, {}, "OTP sent successfully");
  } catch (error) {
    console.error("Error sending OTP:", error);
    sendError(res, 500, "Internal server error");
  }
}

export async function verifyOtpHandler(req: Request, res: Response) {
  try {
    const { mobile, otp } = req.body;
    const valid = await verifyOtp(mobile, otp);
    if (!valid) {
      sendError(res, 400, "Invalid OTP");
      return;
    }
    const user = await getOrCreateUser(mobile);
    if (!user) {
      sendError(res, 500, "Failed to get or create use r");
      return;
    }

    const token = generateToken({
      userId: user.userId,
      mobile,
      role: user.role,
    });
    if (user.status === "inactive") {
      sendSuccess(res, { token, user }, "OTP verified, user is inactive");
      return;
    }
    sendSuccess(res, { token, user });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    sendError(res, 500, "Internal server error");
  }
}
