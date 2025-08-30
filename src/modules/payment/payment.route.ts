import { Router } from "express";
import { validateZod } from "../../middlewares/validate.ts";
import {
  getAllPaymentsHandler,
  getPaymentByIdHandler,
} from "./payment.controller.ts";
import {
  paymentFilterInputSchemaZ,
  paymentParamsInputSchemaZ,
} from "./payment.model.ts";

const router = Router();

router.post(
  "/getPaymentById",
  validateZod(paymentParamsInputSchemaZ),
  getPaymentByIdHandler
);

router.post(
  "/getAllPayments",
  validateZod(paymentFilterInputSchemaZ),
  getAllPaymentsHandler
);

export default router;
