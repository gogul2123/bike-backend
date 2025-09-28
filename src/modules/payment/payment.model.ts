import { z } from "zod";

const paymentStatus = ["PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED"];

export const createPaymentSchemaZ = z.object({
  userId: z.string(),
  amount: z.number().nonnegative(),
  paymentMode: z.string(),
  paymentStatus: z.enum(paymentStatus),
});

export const paymentFilterSchemaZ = z.object({
  userId: z.string().optional(),
  status: z.enum(paymentStatus).optional(),
  paymentMode: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().optional(),
});

export const paymentSchemaZ = z.object({
  _id: z
    .object({
      $oid: z.string(),
    })
    .optional(),
  bookingId: z.string(),
  paymentId: z.string(),
  userId: z.string(),
  amount: z.number(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  status: z.enum(paymentStatus),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createPaymentInputSchemaZ = paymentSchemaZ.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export const paymentParamsInputSchemaZ = z
  .object({
    paymentId: z.string().optional(),
    bookingId: z.string().optional(),
  })
  .refine((data) => data.paymentId || data.bookingId, {
    message: "Either paymentId or bookingId must be provided",
    path: ["paymentId", "bookingId"],
  });

export const paymentFilterInputSchemaZ = z.object({
  userId: z.string().optional(),
  status: z.enum(paymentStatus).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  bookingId: z.string().optional(),
  paymentId: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
});

export type Payment = z.infer<typeof paymentSchemaZ>;
export type CreatePaymentInput = z.infer<typeof createPaymentInputSchemaZ>;
export type PaymentFilterInput = z.infer<typeof paymentFilterInputSchemaZ>;
export type PaymentParamsInput = z.infer<typeof paymentParamsInputSchemaZ>;
