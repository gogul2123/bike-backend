// src/app.ts
import express, { RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
import authRoutes from "./modules/auth/otp.routes.ts";
import userRoute from "./modules/user/user.route.ts";
import bikeRoute from "./modules/bike/bike.routes.ts";
import bookingRoute from "./modules/booking/booking.routes.ts";
import contactRoute from "./modules/contact/contact.route.ts";
import paymentRoute from "./modules/payment/payment.route.ts";
import adminRoute from "./modules/admin/dashboad.routes.ts";
import { authenticateToken } from "./middlewares/auth.ts";
// import uploadRouter from "./modules/fileUpload/upload.route.ts";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://192.168.1.15:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(authenticateToken);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoute);
app.use("/api/bike", bikeRoute);
app.use("/api/booking", bookingRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/contact", contactRoute);
app.use("/api/admin", adminRoute);
// app.use("/api/image/upload", uploadRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
