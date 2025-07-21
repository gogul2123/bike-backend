// src/app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
const app = express();
import authRoutes from "./modules/auth/otp.routes";

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.post("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
