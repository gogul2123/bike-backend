import { z } from "zod";

export const createPaymentSchemaZ = z.object({
  transactionId: z.string(),
  userId: z.string(),
  amount: z.number().nonnegative(),
  paymentMode: z.string(),
  paymentStatus: z.enum(["pending", "successful", "failed"]),
});

export const paymentFilterSchemaZ = z.object({
  userId: z.string().optional(),
  paymentStatus: z.enum(["pending", "successful", "failed"]).optional(),
  paymentMode: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().optional(),
});

export const paymentParamsSchemaZ = z.object({
  transactionId: z.string(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchemaZ>;
export type PaymentFilterInput = z.infer<typeof paymentFilterSchemaZ>;
export type PaymentParamsInput = z.infer<typeof paymentParamsSchemaZ>;
