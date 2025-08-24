import { Request, Response } from "express";
import {
  completeBookingPayment,
  createBooking,
  createBookingOrder,
  updateBookingStatus,
} from "./booking.service.ts";
import { getCollection } from "../db/database.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { bikeId, vehicleNumber, userId, amount } = req.body;

    const orderData = await createBookingOrder(
      bikeId,
      vehicleNumber,
      userId,
      amount
    );

    if (orderData) {
      sendSuccess(res, orderData);
      return;
    }
    sendError(res, orderData);
  } catch (err: any) {
    console.log("errir", err);
    res.status(500).json({ error: err.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      bikeId,
      vehicleNumber,
      userId,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const result = await completeBookingPayment(
      bikeId,
      vehicleNumber,
      userId,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (result.success) {
      res.redirect(
        `https://your-frontend.com/payment-success?transactionId=${result.paymentId}`
      );
    } else {
      res.redirect(`https://your-frontend.com/payment-failed`);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
