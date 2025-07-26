import dotenv from "dotenv";

dotenv.config();

export const envConfig = {
  port: process.env.PORT || "4000",
  jwtSecret: process.env.JWT_SECRET!,
  nodeEnv: process.env.NODE_ENV || "development",
  speak_easySecret: process.env.SPEAKEASY_SECRET!,
  mongoDbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  mongoDbName: process.env.MONGODB_NAME || "bike",
};

for (const [k, v] of Object.entries(envConfig)) {
  if (v == null) throw new Error(`Missing env var ${k}`);
}
