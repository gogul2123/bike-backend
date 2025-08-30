// modules/auth/otp.controller.ts
import { Request, Response } from "express";
import { generateToken } from "../../utils/jwt.ts";
import { sendOtp, verifyOtp } from "./otp.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";
import { envConfig } from "../../config/env.ts";
import { getCollection } from "../db/database.ts";
import bcrypt from "bcrypt";
import { email } from "zod";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { sendMail, sendOTPMail } from "../../services/gmail.service.ts";
import { getOrCreateUser } from "../user/user.service.ts";

export async function sendOtpHandler(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const otp = await sendOtp(email);
    // const data = sendOTPMail(email, { otp });
    // console.log(data);
    if (envConfig.nodeEnv === "development") {
      console.log(`OTP for ${email}: ${otp}`);
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
    const { email, otp } = req.body;
    const valid = await verifyOtp(email, otp);
    if (!valid) {
      sendError(res, 400, "Invalid OTP");
      return;
    }
    const user = await getOrCreateUser(email, "user");
    if (!user) {
      sendError(res, 500, "Failed to get or create use r");
      return;
    }
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });
    sendSuccess(res, { token, user });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    sendError(res, 500, "Internal server error");
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { emailOrMobile, password } = req.body;
    const col = await getCollection("users");
    const user = await col.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }],
    });

    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      sendError(res, 401, "Invalid credentials");
      return;
    }

    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });
    sendSuccess(res, { token, user });
  } catch (error) {
    console.error("Error logging in:", error);
    sendError(res, 500, "Internal server error");
  }
}

export async function signUpHandler(req: Request, res: Response) {
  try {
    const { email, name, mobile, password } = req.body;
    // const otp = await sendOtp();
    const hashedPassword = await bcrypt.hash(password, 10);
    const col = await getCollection("users");
    const user = await col.findOne({
      $or: [{ email }, { mobile }],
    });

    if (user) {
      sendError(res, 400, "User already exists");
      return;
    }
    const newUser = {
      userId: generateNumericEpochId("USR"),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "user",
      status: "inactive" as const,
      email,
      name,
      mobile,
      password: hashedPassword,
    };
    await col.insertOne(newUser);
    sendSuccess(res, newUser, "User created successfully");
    return;
  } catch (error) {
    console.error("Error signing up:", error);
    sendError(res, 500, "Internal server error");
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { email, newPassword } = req.body;
    const col = await getCollection("users");
    const user = await col.findOne({ email });
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await col.updateOne({ email }, { $set: { password: hashedPassword } });
    sendSuccess(res, {}, "Password reset successfully");
  } catch (error) {
    console.error("Error resetting password:", error);
    sendError(res, 500, "Internal server error");
  }
}
