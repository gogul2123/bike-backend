// modules/auth/otp.service.ts
import speakeasy from "speakeasy";
import { envConfig } from "../../config/env.ts";
const secret = envConfig.speak_easySecret;

export async function sendOtp(mobile: string) {
  const token = speakeasy.totp({
    secret: mobile,
    encoding: "base32",
    digits: 6,
    step: 30,
  });
  return token;
}

export async function verifyOtp(
  mobile: string,
  token: string
): Promise<boolean> {
  const verified = speakeasy.totp.verify({
    secret: mobile,
    encoding: "base32",
    token,
    window: 5,
  });
  return verified;
}
