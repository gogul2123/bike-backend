import { Request, Response } from "express";
import {
  createPayment,
  getAllPayments,
  getPaymentByTransaction,
} from "./payment.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";

export const createPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { userId, transactionId, amount, paymentStatus, paymentMode } =
      req.body;
    const payment = {
      paymentId: generateNumericEpochId("PAY"),
      userId,
      transactionId,
      amount,
      paymentStatus,
      paymentMode,
      createdDate: new Date(),
    };
    const result = await createPayment(payment);
    if (!result) {
      sendError(res, 500, "Failed to create payment");
      return;
    }
    sendSuccess(res, payment);
    return;
  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to create payment");
    return;
  }
};

export const getAllPaymentsHandler = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      paymentStatus,
      paymentMode,
      fromDate,
      toDate,
      page = "1",
    } = req.query as any;
    const filter = {
      userId,
      paymentStatus,
      paymentMode,
      fromDate,
      toDate,
    };
    const pageNum = parseInt(page as string) || 1;
    const { total, data } = await getAllPayments(filter, pageNum, 10);
    return sendSuccess(res, { total, data });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Failed to fetch payments");
  }
};

export const getPaymentByTransactionHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { transactionId } = req.params;
    const payment = await getPaymentByTransaction(transactionId);
    if (!payment) return sendError(res, 404, "Payment not found");
    return sendSuccess(res, payment);
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Failed to fetch payment");
  }
};
