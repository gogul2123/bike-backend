import dotenv from "dotenv";

dotenv.config();

export const envConfig = {
  port: process.env.PORT || "4000",
  jwtSecret: process.env.JWT_SECRET!,
  nodeEnv: process.env.NODE_ENV || "development",
};
