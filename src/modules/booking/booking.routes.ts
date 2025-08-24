import { Router } from "express";
import { validateZod } from "../../middlewares/validate.ts";
import { bookBikeSchema, verifyPaymentSchema } from "./booking.model.ts";
import { createOrder, verifyPayment } from "./booking.controller.ts";

const router = Router();

router.post("/create-order", validateZod(bookBikeSchema), createOrder);
router.post("/verify-payment", validateZod(verifyPaymentSchema), verifyPayment);

export default router;
