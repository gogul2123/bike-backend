import { Router } from "express";
import {
  logoutHandler,
  sendOtpHandler,
  verifyOtpHandler,
} from "./otp.controller.ts";
import { loginSchema, sendOtpSchema, verifyOtpSchema } from "./otp.model.ts";
import { validateZod } from "../../middlewares/validate.ts";
import { loginHandler, signUpHandler } from "./otp.controller.ts";
import { signUpSchema } from "../user/user.model.ts";
import { getOrCreateUser } from "../user/user.service.ts";
import { resetPasswordSchema } from "./otp.model.ts";
import { resetPasswordHandler } from "./otp.controller.ts";

const router = Router();

router.post("/send", validateZod(sendOtpSchema), sendOtpHandler);
router.post("/verify", validateZod(verifyOtpSchema), verifyOtpHandler);
router.post(
  "/reset-password",
  validateZod(resetPasswordSchema),
  resetPasswordHandler
);
router.post("/logout", logoutHandler);

router.post("/login", validateZod(loginSchema), loginHandler);
router.post("/signUp", validateZod(signUpSchema), signUpHandler);

export default router;
