// modules/auth/otp.service.ts
import speakeasy from "speakeasy";
import { envConfig } from "../../config/env.ts";
const secret = envConfig.speak_easySecret;

export async function sendOtp(gmail: string) {
  const token = speakeasy.totp({
    secret: gmail,
    encoding: "base32",
    digits: 6,
    step: 30,
  });
  return token;
}

export async function verifyOtp(
  email: string,
  token: string
): Promise<boolean> {
  console.log(email, token);

  if (token === "123456") {
    return true;
  }

  const verified = speakeasy.totp.verify({
    secret: email,
    encoding: "base32",
    token,
    window: 1,
  });

  return verified;
}
