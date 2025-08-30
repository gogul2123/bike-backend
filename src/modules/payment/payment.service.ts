import { getCollection } from "../db/database.ts";
import { Filter } from "mongodb";
import {
  CreatePaymentInput,
  Payment,
  PaymentFilterInput,
} from "./payment.model.ts";

export async function createPayment(
  payment: CreatePaymentInput
): Promise<string | null> {
  const col = await getCollection("payments");
  const now = new Date().toISOString();

  const paymentWithTimestamps = {
    ...payment,
    createdAt: { $date: now },
    updatedAt: { $date: now },
  };

  const result = await col.insertOne(paymentWithTimestamps);
  return result.insertedId.toString();
}

export async function getPaymentById(
  paymentId: string
): Promise<Payment | null> {
  const col = await getCollection("payments");
  return (await col.findOne(
    { paymentId },
    { projection: { _id: 0 } }
  )) as Payment | null;
}

export async function getPaymentByBookingId(
  bookingId: string
): Promise<Payment | null> {
  const col = await getCollection("payments");
  return (await col.findOne(
    { bookingId },
    { projection: { _id: 0 } }
  )) as Payment | null;
}

export async function getAllPayments(
  filter: PaymentFilterInput
): Promise<{ payments: Payment[]; total: number }> {
  const col = await getCollection("payments");
  const match: Filter<Payment> = {};

  // Build filter conditions
  if (filter.userId) match.userId = filter.userId;
  if (filter.status) match.status = filter.status;
  if (filter.bookingId) match.bookingId = filter.bookingId;
  if (filter.paymentId) match.paymentId = filter.paymentId;

  // Date range filter
  if (filter.fromDate || filter.toDate) {
    match.createdAt = {}; // Initialize createdAt as an empty object
    if (filter.fromDate) match.createdAt.$gte = filter.fromDate;
    if (filter.toDate) match.createdAt.$lte = filter.toDate;
  }

  const pipeline = [
    { $match: match },
    { $sort: { "createdAt.$date": -1 } },
    {
      $facet: {
        items: [
          { $skip: ((filter.page as number) - 1) * (filter.limit as number) },
          { $limit: filter.limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
    {
      $project: {
        data: "$items",
        total: { $arrayElemAt: ["$totalCount.count", 0] },
      },
    },
  ];

  const result = await col.aggregate(pipeline).toArray();
  const { payments = [], total = 0 } = result[0] || {};
  return { payments, total };
}

export const updatePaymentStatus = async (
  paymentId: string,
  updates: Partial<Pick<Payment, "status" | "razorpay_payment_id">>
): Promise<boolean> => {
  const col = await getCollection("payments");
  const result = await col.updateOne(
    { paymentId },
    {
      $set: {
        ...updates,
        updatedAt: { $date: new Date().toISOString() },
      },
    }
  );
  return result.modifiedCount > 0;
};

export const updatePaymentByBookingId = async (
  bookingId: string,
  updates: Partial<Pick<Payment, "status" | "razorpay_payment_id">>
): Promise<boolean> => {
  const col = await getCollection("payments");
  const result = await col.updateOne(
    { bookingId },
    {
      $set: {
        ...updates,
        updatedAt: { $date: new Date().toISOString() },
      },
    }
  );
  return result.modifiedCount > 0;
};

export const deletePayment = async (paymentId: string): Promise<boolean> => {
  const col = await getCollection("payments");
  const result = await col.deleteOne({ paymentId });
  return result.deletedCount > 0;
};

export const savePayment = async (payment: Payment) => {
  const paymentsCol = await getCollection("payments");
  await paymentsCol.insertOne(payment);
};

export const updatePayment = async (
  bookingId: string,
  status: Payment["status"],
  razorpay_payment_id: Payment["razorpay_payment_id"]
) => {
  const paymentsCol = await getCollection("payments");
  await paymentsCol.updateOne(
    {
      bookingId: bookingId,
    },
    { $set: { status, razorpay_payment_id } }
  );
};
