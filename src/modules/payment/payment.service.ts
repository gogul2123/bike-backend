import { getCollection } from "../db/database.ts";
import {
  CreatePaymentInput,
  Payment,
  PaymentFilterInput,
  paymentParamsSchemaZ,
} from "./payment.model.ts";

export async function createPayment(
  payment: CreatePaymentInput
): Promise<string | null | boolean> {
  const col = await getCollection("payments");
  const result = await col.insertOne(payment);
  return result.insertedId.toString() || null;
}

export async function getPaymentByTransaction(transactionId: string) {
  const col = await getCollection("payments");
  return (await col.findOne(
    { transactionId },
    { projection: { _id: 0 } }
  )) as CreatePaymentInput | null;
}

export async function getAllPayments(
  filter: PaymentFilterInput,
  page: number = 1,
  limit: number = 10
) {
  const col = await getCollection("payments");
  const match: any = {};
  if (filter.userId) match.userId = filter.userId;
  if (filter.paymentStatus) match.paymentStatus = filter.paymentStatus;
  if (filter.paymentMode) match.paymentMode = filter.paymentMode;
  if (filter.fromDate || filter.toDate) {
    match.createdDate = {};
    if (filter.fromDate) match.createdDate.$gte = filter.fromDate;
    if (filter.toDate) match.createdDate.$lte = filter.toDate;
  }

  const pipeline = [
    { $match: match },
    { $sort: { createdDate: -1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
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
  const { data = [], total = 0 } = result[0] || {};
  return { data, total };
}

export const savePayment = async (payment: Payment) => {
  const paymentsCol = await getCollection("payments");
  await paymentsCol.insertOne(payment);
};
