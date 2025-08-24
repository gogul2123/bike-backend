import { Router } from "express";
import { sendOtpHandler, verifyOtpHandler } from "./otp.controller.ts";
import { loginSchema, sendOtpSchema, verifyOtpSchema } from "./otp.model.ts";
import { validateZod } from "../../middlewares/validate.ts";
import { loginHandler, signUpHandler } from "./otp.controller.ts";
import { signUpSchema } from "../user/user.model.ts";
import { getOrCreateUser } from "../user/user.service.ts";

const router = Router();

router.post("/send", validateZod(sendOtpSchema), sendOtpHandler);
router.post("/verify", validateZod(verifyOtpSchema), verifyOtpHandler);

router.post("/login", validateZod(loginSchema), loginHandler);
router.post("/signUp", validateZod(signUpSchema), signUpHandler);

export default router;
