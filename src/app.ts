// src/app.ts
import express, { RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
const app = express();
import authRoutes from "./modules/auth/otp.routes.ts";
import userRoute from "./modules/user/user.route.ts";
import bikeRoute from "./modules/bike/bike.routes.ts";
import bookingRoute from "./modules/booking/booking.routes.ts";

app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoute);
app.use("/api/bike", bikeRoute);
app.use("/api/booking", bookingRoute);

app.post("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
