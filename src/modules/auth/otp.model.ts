import { email, z } from "zod";

export const sendOtpSchema = z.object({
  email: z.string().email(),
  // fullName: z.string().min(1, { message: "Full name is required." }),
  // mobile: z
  //   .string()
  //   .min(1, { message: "Mobile number is required." })
  //   .length(10, { message: "Mobile number must be 10 digits." })
  //   .regex(/^\d+$/, { message: "Mobile number must contain only digits." }),
  // password: z
  //   .string()
  //   .min(6, { message: "Password must be at least 8 characters long." })
  //   .regex(
  //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
  //     {
  //       message:
  //         "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
  //     }
  //   ),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .min(1, { message: "OTP is required." })
    .length(6, { message: "OTP must be exactly 6 digits." })
    .regex(/^[0-9]+$/, { message: "OTP must contain only digits." }),
});

export const loginSchema = z.object({
  emailOrMobile: z.string().email(),
  password: z.string().min(1, { message: "Password is required." }),
});
