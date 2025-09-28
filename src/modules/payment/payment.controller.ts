import { Request, Response } from "express";

import { sendError, sendSuccess } from "../../utils/response.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import {
  createPayment,
  getAllPayments,
  getPaymentByBookingId,
  getPaymentById,
} from "./payment.service.ts";
import { PaymentFilterInput } from "./payment.model.ts";

// export const createPaymentHandler = async (req: Request, res: Response) => {
//   try {
//     const { userId, bookingId, amount, paymentStatus } = req.body;
//     const payment = {
//       paymentId: generateNumericEpochId("PAY"),
//       userId,
//       bookingId,
//       amount,
//       razorpay_order_id: "",
//       razorpay_payment_id: "",
//       status: paymentStatus,
//     };
//     const result = await createPayment(payment);
//     if (!result) {
//       sendError(res, 500, "Failed to create payment");
//       return;
//     }
//     sendSuccess(res, payment);
//     return;
//   } catch (err) {
//     console.error(err);
//     sendError(res, 500, "Failed to create payment");
//     return;
//   }
// };

export const getAllPaymentsHandler = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      search = "",
    } = req.body as PaymentFilterInput;
    const filter = {
      userId,
      status,
      fromDate,
      toDate,
      limit: limit,
      page: page,
      search,
    };
    const { total, payments, capturedAmount } = await getAllPayments(filter);
    if (!payments) {
      sendError(res, 404, "No payments found");
      return;
    }
    sendSuccess(res, { total, payments, capturedAmount });
  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to fetch payments");
  }
};

export const getPaymentByIdHandler = async (req: Request, res: Response) => {
  try {
    const { paymentId, bookingId } = req.body;
    if (paymentId) {
      const payment = await getPaymentById(paymentId);
      if (!payment) {
        sendError(res, 404, "Payment not found");
        return;
      }
      sendSuccess(res, payment);
    } else if (bookingId) {
      const payment = await getPaymentByBookingId(bookingId);
      if (!payment) {
        sendError(res, 404, "Payment not found");
        return;
      }
      sendSuccess(res, payment);
    }
  } catch (err) {
    sendError(res, 500, "Failed to fetch payment");
  }
};

export const getPaymentByBookingIdHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { bookingId } = req.params;
    const payment = await getPaymentByBookingId(bookingId);
    if (!payment) {
      return sendError(res, 404, "Payment not found");
    } else {
      return sendSuccess(res, payment);
    }
  } catch (err) {
    sendError(res, 500, "Failed to fetch payment");
  }
};
