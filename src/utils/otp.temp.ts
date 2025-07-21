// // modules/auth/utils/otp.temp.ts
// import { createClient } from "redis";
// const client = createClient({ url: process.env.REDIS_URL });
// client.connect();

// export async function setSecret(key: string, secret: string, ttlSec: number) {
//   await client.setEx(`otp:${key}`, ttlSec, secret);
// }
// export async function getSecret(key: string) {
//   return client.get(`otp:${key}`);
// }
// export async function deleteSecret(key: string) {
//   await client.del(`otp:${key}`);
// }
