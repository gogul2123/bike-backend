// src/app.ts
import express, { RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
const app = express();
import authRoutes from "./modules/auth/otp.routes.ts";
import userRoute from "./modules/user/user.route.ts";

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoute);

app.post("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
