import { Router } from "express";
import { sendOtpHandler, verifyOtpHandler } from "./otp.controller.ts";
import { sendOtpSchema, verifyOtpSchema } from "./otp.model.ts";
import { validateZod } from "../../middlewares/validate.ts";

const router = Router();

router.post("/send", validateZod(sendOtpSchema), sendOtpHandler);
router.post("/verify", validateZod(verifyOtpSchema), verifyOtpHandler);

export default router;
