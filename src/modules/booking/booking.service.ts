import { razorpay } from "../../services/razorpay.service.ts";
import { holdBike, bookBike, releaseBike } from "../bike/bike.service.ts";
import { savePayment } from "../payment/payment.service.ts";
import crypto from "crypto";
import { Booking, BookingSchema } from "./booking.model.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { getCollection } from "../db/database.ts";

export const BOOK_HOLD_DURATION = 15 * 60 * 1000; // 15 minutes

export const createBookingOrder = async (
  bikeId: string,
  vehicleNumber: string,
  userId: string,
  amount: number
) => {
  await holdBike(bikeId, vehicleNumber, BOOK_HOLD_DURATION);
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${bikeId}_${vehicleNumber}}`,
    payment_capture: false,
  });

  return {
    orderId: order.id,
    razorpayKey: process.env.RAZORPAY_KEY_ID,
  };
};

export const updateBookingStatus = async (
  orderId: string,
  paymentStatus: "success" | "failed",
  orderStatus: "ACTIVE" | "INITIAED" | "COMPLETED"
) => {
  console.log("update booking triggered");
  const bookingsCol = await getCollection("booking");

  const result = await bookingsCol.findOneAndUpdate(
    { orderId },
    { $set: { paymentStatus, orderStatus, updatedAt: new Date() } }
  );

  console.log("result", result);
  return result.value;
};

export const completeBookingPayment = async (
  bikeId: string,
  vehicleNumber: string,
  userId: string,
  amount: number,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature === razorpay_signature) {
    // Payment verified → capture it
    const captured = await razorpay.payments.capture(
      razorpay_payment_id,
      amount * 100,
      "INR"
    );
    const booked = await bookBike(bikeId, vehicleNumber);
    // await createBooking({
    //   orderId: razorpay_order_id,
    //   bikeId,
    //   vehicleNumber,
    //   userId,
    //   amount,
    // });

    await savePayment({
      bikeId,
      vehicleNumber,
      userId,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      status: "captured",
      createdAt: new Date(),
    });

    return { success: true, paymentId: razorpay_payment_id };
  } else {
    await releaseBike(bikeId, vehicleNumber);
    await savePayment({
      bikeId,
      vehicleNumber,
      userId,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      status: "failed",
      createdAt: new Date(),
    });
    return { success: false };
  }
};

export const createBooking = async (
  data: Omit<
    Booking,
    "bookingId" | "createdAt" | "updatedAt" | "paymentStatus" | "orderStatus"
  >
) => {
  const bookingsCol = await getCollection("booking");
  const booking: Booking = BookingSchema.parse({
    bookingId: generateNumericEpochId("ODR"),
    ...data,
    paymentStatus: "success",
    orderStatus: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await bookingsCol.insertOne(booking);
  return booking;
};

export const getBookingById = async (bookingId: string) => {
  const bookingsCol = await getCollection("booking");
  const booking = await bookingsCol.findOne({ bookingId });
  return booking;
};

export const getAllBookings = async (page = 1, limit = 10) => {
  const bookingsCol = await getCollection("booking");
  const skip = (page - 1) * limit;
  const bookings = await bookingsCol.find().skip(skip).limit(limit).toArray();
  const total = await bookingsCol.countDocuments();
  return { total, page, limit, bookings };
};
