import { z } from "zod";

export const bookBikeSchema = z.object({
  bikeId: z.string(),
  vehicleNumber: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  bikeId: z.string(),
  vehicleNumber: z.string(),
  userId: z.string(),
  amount: z.number(),
});

export const BookingSchema = z
  .object({
    bookingId: z.string(),
    bikeId: z.string(),
    vehicleNumber: z.string(),
    userId: z.string(),
    amount: z.number(),
    orderId: z.string().optional(),
    paymentId: z.string().optional(),
    paymentStatus: z.enum(["pending", "success", "failed"]).default("pending"),
    orderStatus: z
      .enum(["ACTIVE", "COMPLETED", "INITIATED"])
      .default("INITIATED"),

    fromDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "fromDate is required and must be a valid date" })
    ),
    toDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "toDate is required and must be a valid date" })
    ),

    createdAt: z.preprocess(
      (v) => new Date(v as string),
      z.date({ message: "createdAt must be a date" })
    ),
    updatedAt: z.preprocess(
      (v) => new Date(v as string),
      z.date({ message: "updatedAt must be a date" })
    ),
  })
  .refine((data) => data.toDate.getTime() > data.fromDate.getTime(), {
    message: "toDate must be after fromDate (including time)",
    path: ["toDate"],
  });

export type Booking = z.infer<typeof BookingSchema>;
