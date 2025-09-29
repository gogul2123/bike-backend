import { getCollection } from "../db/database.ts";
import { Filter } from "mongodb";
import {
  CreatePaymentInput,
  Payment,
  PaymentFilterInput,
} from "./payment.model.ts";
import { da } from "zod/locales";

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

// export async function getAllPayments(
//   filter: PaymentFilterInput
// ): Promise<{ payments: Payment[]; total: number }> {
//   const col = await getCollection("payments");
//   const match: Filter<Payment> = {};

//   // Build filter conditions
//   if (filter.userId) match.userId = filter.userId;
//   if (filter.status) match.status = filter.status;
//   if (filter.bookingId) match.bookingId = filter.bookingId;
//   if (filter.paymentId) match.paymentId = filter.paymentId;

//   // Date range filter
//   if (filter.fromDate || filter.toDate) {
//     match.createdAt = {}; // Initialize createdAt as an empty object
//     if (filter.fromDate) match.createdAt.$gte = filter.fromDate;
//     if (filter.toDate) match.createdAt.$lte = filter.toDate;
//   }

//   const pipeline = [
//     { $match: match },
//     { $sort: { createdAt: -1 } },
//     {
//       $facet: {
//         payments: [
//           { $skip: ((filter.page as number) - 1) * (filter.limit as number) },
//           { $limit: filter.limit },
//           {
//             $project: {
//               _id: 0,
//               createdAt: 0,
//               updatedAt: 0,
//               razorpay_order_id: 0,
//               razorpay_payment_id:0,
//             },
//           },
//         ],
//         totalCount: [{ $count: "count" }],
//         totalCaptured: [
//           { $match: { status: "SUCCESS" } },
//           { $group: { _id: null, total: { $sum: "$amount" } } },
//         ],
//       },
//     },
//     {
//       $project: {
//         payments: 1,
//         total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
//         capturedAmount: {
//           $ifNull: [{ $arrayElemAt: ["$totalCaptured.total", 0] }, 0],
//         },
//       },
//     },
//   ];

//   const result = await col.aggregate(pipeline).toArray();

//   console.log("result", result);
//   const { payments = [], total = 0 } = result[0] || {};
//   return { payments, total };
// }

export async function getAllPayments(
  filter: PaymentFilterInput
): Promise<{ payments: Payment[]; total: number; capturedAmount: number }> {
  const col = await getCollection("payments");
  const match: Filter<Payment> = {};

  // Build basic filter conditions
  if (filter?.userId) match.userId = filter.userId;
  if (filter?.status) match.status = filter.status;

  // Date range filter
  if (filter?.fromDate || filter.toDate) {
    match.createdAt = {};
    if (filter?.fromDate) match.createdAt.$gte = filter?.fromDate;
    if (filter?.toDate) match.createdAt.$lte = filter?.toDate;
  }

  // Search filter
  if (filter?.search) {
    const searchRegex = new RegExp(filter?.search, "i"); // case-insensitive
    match.$or = [
      { paymentId: searchRegex },
      { bookingId: searchRegex },
      { amount: { $eq: Number(filter?.search) } }, // match exact amount if numeric
    ];
  }

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        payments: [
          { $skip: ((filter.page as number) - 1) * (filter.limit as number) },
          { $limit: filter.limit },
          {
            $project: {
              _id: 0,
              createdAt: 0,
              updatedAt: 0,
              razorpay_order_id: 0,
              razorpay_payment_id: 0,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
        totalCaptured: [
          { $match: { status: "SUCCESS" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ],
      },
    },
    {
      $project: {
        payments: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
        capturedAmount: {
          $ifNull: [{ $arrayElemAt: ["$totalCaptured.total", 0] }, 0],
        },
      },
    },
  ];

  const result = await col.aggregate(pipeline).toArray();
  console.log("result", result);
  const { payments = [], total = 0, capturedAmount = 0 } = result[0] || {};
  return { payments, total, capturedAmount };
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

export const updatePayment = async (data: Partial<Payment>) => {
  const paymentsCol = await getCollection("payments");

  await paymentsCol.updateOne(
    {
      bookingId: data.bookingId,
    },
    { $set: { ...data } }
  );
};
