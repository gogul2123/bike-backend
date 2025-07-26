import { z } from "zod";

export const sendOtpSchema = z.object({
  mobile: z
    .string()
    .min(1, { message: "Mobile is required." })
    .length(10, { message: "Mobile must be exactly 10 digits." })
    .regex(/^[0-9]+$/, { message: "Mobile must contain only digits." }),
});

export const verifyOtpSchema = z.object({
  mobile: z
    .string()
    .min(1, { message: "Mobile is required." })
    .length(10, { message: "Mobile must be exactly 10 digits." })
    .regex(/^[0-9]+$/, { message: "Mobile must contain only digits." }),
  otp: z
    .string()
    .min(1, { message: "OTP is required." })
    .length(6, { message: "OTP must be exactly 6 digits." })
    .regex(/^[0-9]+$/, { message: "OTP must contain only digits." }),
});
