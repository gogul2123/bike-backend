import crypto from "crypto";
import { razorpay } from "../../services/razorpay.service.ts";
import {
  holdBike,
  bookBike,
  releaseBike,
  releaseExpiredHolds,
  getBikeById,
  holdMultipleVehicles,
  releaseMultipleVehicles,
  bookMultipleVehicles,
} from "../bike/bike.service.ts";
import { savePayment, updatePayment } from "../payment/payment.service.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { getCollection } from "../db/database.ts";
import {
  Booking,
  BookingVehicle,
  PricingBreakdown,
  ItemPricingBreakdown,
  CreateBookingInputType,
  UpdateBookingInputType,
  CancelBookingInputType,
  BookingQueryInputType,
  BookingSchema,
  CreateBookingInput,
  UpdateBookingInput,
  CancelBookingInput,
  BookingQueryInput,
} from "./booking.model.ts";

export const BOOK_HOLD_DURATION = 15 * 60 * 1000; // 15 minutes

// Helper function to calculate days between dates
function calculateDays(fromDate: Date, toDate: Date): number {
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to count weekend days in a date range
function countWeekendDays(fromDate: Date, toDate: Date): number {
  let weekendCount = 0;
  const currentDate = new Date(fromDate);

  while (currentDate <= toDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday = 0, Saturday = 6
      weekendCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return weekendCount;
}

// Helper function to calculate pricing breakdown
async function calculatePricingBreakdown(
  vehicles: Array<{ bikeId: string; vehicleNumber: string }>,
  fromDate: Date,
  toDate: Date
): Promise<PricingBreakdown> {
  const totalDays = calculateDays(fromDate, toDate);
  const totalWeekendCount = countWeekendDays(fromDate, toDate);
  const totalWeekdayCount = totalDays - totalWeekendCount;

  const items: ItemPricingBreakdown[] = [];
  let totalBaseAmount = 0;
  let totalWeekendAmount = 0;
  let subtotalAmount = 0;

  // Get bike details for each vehicle and calculate pricing
  for (const vehicle of vehicles) {
    const bike = await getBikeById(vehicle.bikeId);
    if (!bike) {
      throw new Error(`Bike not found: ${vehicle.bikeId}`);
    }

    const basePrice = bike.pricing.basePrice;
    const weekendMultiplier = bike.pricing.weekendMultiplier;

    const weekdayAmount = totalWeekdayCount * basePrice;
    const weekendAmount = totalWeekendCount * basePrice * weekendMultiplier;
    const vehicleSubtotal = weekdayAmount + weekendAmount;

    // items.push({
    //   bikeId: vehicle.bikeId,
    //   vehicleNumber: vehicle.vehicleNumber,
    //   baseAmount: weekdayAmount,
    //   weekendAmount: weekendAmount,
    //   subtotal: vehicleSubtotal,
    //   weekdayCount: totalWeekdayCount,
    //   weekendCount: totalWeekendCount,
    // });

    totalBaseAmount += weekdayAmount;
    totalWeekendAmount += weekendAmount;
    subtotalAmount += vehicleSubtotal;
  }

  // Calculate tax (you can modify this logic as needed)
  const taxAmount = subtotalAmount * 0.18; // 18% GST
  const totalAmount = subtotalAmount + taxAmount;

  return {
    totalBaseAmount,
    totalWeekendAmount,
    subtotalAmount,
    taxAmount,
    discountAmount: 0,
    totalAmount,
    totalDays,
    totalWeekdayCount,
    totalWeekendCount,
    currency: "INR",
  };
}

// Helper function to create booking vehicles with denormalized data
async function createBookingVehicles(
  vehicles: Array<{ bikeId: string; vehicleNumber: string }>
): Promise<BookingVehicle[]> {
  const bookingVehicles: BookingVehicle[] = [];

  for (const vehicle of vehicles) {
    const bike = await getBikeById(vehicle.bikeId);
    if (!bike) {
      throw new Error(`Bike not found: ${vehicle.bikeId}`);
    }

    // Find the specific vehicle
    const vehicleData = bike.vehicles.find(
      (v) => v.vehicleNumber === vehicle.vehicleNumber
    );
    if (!vehicleData) {
      throw new Error(`Vehicle not found: ${vehicle.vehicleNumber}`);
    }

    if (vehicleData.status !== "AVAILABLE") {
      throw new Error(`Vehicle ${vehicle.vehicleNumber} is not available`);
    }

    bookingVehicles.push({
      bikeId: vehicle.bikeId,
      vehicleNumber: vehicle.vehicleNumber,
      modelName: bike.modelInfo.model,
      brand: bike.modelInfo.brand,
      category: bike.modelInfo.category,
      basePrice: bike.pricing.basePrice,
      weekendMultiplier: bike.pricing.weekendMultiplier,
      currency: bike.pricing.currency,
    });
  }

  return bookingVehicles;
}

export async function createBookingOrderService(
  data: CreateBookingInputType
): Promise<{ orderId: string; razorpayKey: string; booking: Booking }> {
  // Validate input
  const validatedData = CreateBookingInput.parse(data);

  // Release any expired holds first
  await releaseExpiredHolds();

  // Create booking vehicles with denormalized data
  const bookingVehicles = await createBookingVehicles(validatedData.vehicles);

  console.log("Booking Vehicles:", bookingVehicles);

  // Calculate pricing breakdown
  const pricingBreakdown = await calculatePricingBreakdown(
    validatedData.vehicles,
    validatedData.fromDate,
    validatedData.toDate
  );

  try {
    const result = await holdMultipleVehicles(
      validatedData.vehicles,
      BOOK_HOLD_DURATION,
      validatedData.userId
    );

    if (!result.success) {
      const failedDetails = result.failedVehicles
        .map((f) => `${f.vehicleNumber} (${f.error})`)
        .join(", ");
      throw new Error(`Failed to hold vehicles: ${failedDetails}`);
    }
  } catch (error) {
    releaseMultipleVehicles(
      validatedData.vehicles,
      BOOK_HOLD_DURATION,
      validatedData.userId
    );
    if (error instanceof Error) {
      throw new Error(`Failed to hold vehicles: ${error.message}`);
    } else {
      throw new Error("Failed to hold vehicles: Unknown error occurred");
    }
  }

  // Create Razorpay order
  const order = await razorpay.orders.create({
    amount: Math.round(pricingBreakdown.totalAmount * 100), // Convert to paise
    currency: "INR",
    receipt: `receipt_${generateNumericEpochId("RCP")}`,
    payment_capture: false,
  });

  // Calculate metadata
  const totalDays = calculateDays(validatedData.fromDate, validatedData.toDate);
  const uniqueModels = new Set(
    bookingVehicles.map((v) => `${v.brand}_${v.modelName}`)
  );

  // Create booking
  const bookingData: Omit<Booking, "bookingId"> & { bookingId?: string } = {
    bookingId: generateNumericEpochId("BKG"),
    userId: validatedData.userId,
    vehicles: bookingVehicles,
    fromDate: validatedData.fromDate,
    toDate: validatedData.toDate,
    totalDays,
    pricing: pricingBreakdown,
    // payment: {
    //   orderId: order.id,
    //   paymentStatus: "PENDING",
    //   razorpayOrderId: order.id,
    // },
    bookingStatus: "INITIATED",
    features: validatedData.features,
    metadata: {
      totalVehicles: bookingVehicles.length,
      differentModels: uniqueModels.size,
      isMultiModel: uniqueModels.size > 1,
      customerNotes: validatedData.customerNotes,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Validate and save booking
  const validatedBooking = BookingSchema.parse(bookingData);
  const bookingCollection = await getCollection("bookings");
  await bookingCollection.insertOne(validatedBooking);

  if (validatedBooking) {
    await savePayment({
      bookingId: validatedBooking?.bookingId as string,
      paymentId: generateNumericEpochId("PAY"),
      userId: validatedBooking.userId,
      amount: validatedBooking.pricing.totalAmount,
      razorpay_order_id: order.id,
      razorpay_payment_id: "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    orderId: order.id,
    razorpayKey: process.env.RAZORPAY_KEY_ID!,
    booking: validatedBooking,
  };
}

export async function completeBookingPaymentService(
  bookingId: string,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const bookingCollection = await getCollection("bookings");

  // Find the booking
  const booking = (await bookingCollection.findOne({ bookingId })) as Booking;
  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  // Verify signature
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  console.log("Generated Signature:", generatedSignature);
  console.log("Received Signature:", razorpay_signature);
  console.log(generatedSignature === razorpay_signature);

  if (generatedSignature !== razorpay_signature) {
    // Release all held vehicles

    await releaseMultipleVehicles(
      booking.vehicles,
      BOOK_HOLD_DURATION,
      booking.userId as Booking["userId"]
    );

    // Update booking status
    await bookingCollection.updateOne(
      { bookingId },
      {
        $set: {
          "payment.paymentStatus": "FAILED",
          "payment.razorpayPaymentId": razorpay_payment_id,
          bookingStatus: "CANCELLED",
          updatedAt: new Date(),
        },
      }
    );

    return { success: false, error: "Payment verification failed" };
  } else {
    try {
      // Capture payment
      const result = await razorpay.payments.capture(
        razorpay_payment_id,
        Math.round(booking.pricing.totalAmount * 100),
        "INR"
      );

      console.log("Payment captured:", result);

      // Release all held vehicles

      // Confirm booking for all vehicles
      // const bookPromises = booking.vehicles.map((vehicle) =>
      //   bookBike(vehicle.bikeId, vehicle.vehicleNumber)
      // );
      // await Promise.all(bookPromises);

      if (result) {
        await bookMultipleVehicles(
          booking.vehicles,
          BOOK_HOLD_DURATION,
          booking.userId as Booking["userId"]
        );
      }

      // Update booking status
      const updatedBooking = await bookingCollection.findOneAndUpdate(
        { bookingId },
        {
          $set: {
            "payment.paymentStatus": "SUCCESS",
            "payment.paymentId": razorpay_payment_id,
            "payment.razorpayPaymentId": razorpay_payment_id,
            "payment.transactionDate": new Date(),
            bookingStatus: "CONFIRMED",
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      await updatePayment(bookingId, "captured", razorpay_payment_id);

      // Save payment record
      // await savePayment({
      //   bookingId,
      //   paymentId: generateNumericEpochId("PAY"),
      //   userId: booking.userId,
      //   amount: booking.pricing.totalAmount,
      //   razorpay_order_id,
      //   razorpay_payment_id,
      //   status: "captured",
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // });

      return { success: true, booking: updatedBooking as Booking };
    } catch (error) {
      console.log("error", error);
      if (error instanceof Error) {
        const result = await releaseMultipleVehicles(
          booking.vehicles,
          BOOK_HOLD_DURATION,
          booking.userId as Booking["userId"]
        );
        await bookingCollection.updateOne(
          { bookingId },
          {
            $set: {
              "payment.paymentStatus": "FAILED",
              bookingStatus: "CANCELLED",
              updatedAt: new Date(),
            },
          }
        );

        return {
          success: false,
          error: `Payment capture failed: ${error.message}`,
        };
      } else {
        console.log("error", error);
        return { success: false, error: "Payment capture failed" };
      }
    }
  }
}

export async function updateBookingService(
  data: UpdateBookingInputType
): Promise<Booking> {
  const validatedData = UpdateBookingInput.parse(data);
  const bookingCollection = await getCollection("bookings");

  const updateFields: any = {
    updatedAt: new Date(),
  };

  if (validatedData.bookingStatus) {
    updateFields.bookingStatus = validatedData.bookingStatus;
  }

  if (validatedData.payment) {
    Object.keys(validatedData.payment).forEach((key) => {
      updateFields[`payment.${key}`] =
        validatedData.payment![key as keyof typeof validatedData.payment];
    });
  }

  if (validatedData.features) {
    Object.keys(validatedData.features).forEach((key) => {
      updateFields[`features.${key}`] =
        validatedData.features![key as keyof typeof validatedData.features];
    });
  }

  if (validatedData.internalNotes) {
    updateFields["metadata.internalNotes"] = validatedData.internalNotes;
  }

  const updatedBooking = await bookingCollection.findOneAndUpdate(
    { bookingId: validatedData.bookingId },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (!updatedBooking.value) {
    throw new Error("Booking not found");
  }

  return updatedBooking.value as Booking;
}

export async function cancelBookingService(
  data: CancelBookingInputType
): Promise<Booking> {
  const validatedData = CancelBookingInput.parse(data);
  const bookingCollection = await getCollection("bookings");

  const booking = (await bookingCollection.findOne({
    bookingId: validatedData.bookingId,
  })) as Booking;
  if (!booking) {
    throw new Error("Booking not found");
  }

  const paymentCol = await getCollection("payments");
  const payment = await paymentCol.findOne({
    bookingId: validatedData.bookingId,
  });

  // Check if booking can be cancelled
  if (["COMPLETED", "CANCELLED"].includes(booking.bookingStatus)) {
    throw new Error(
      `Cannot cancel booking with status: ${booking.bookingStatus}`
    );
  }

  // Release all vehicles
  const releasePromises = booking.vehicles.map((vehicle) =>
    releaseBike(vehicle.bikeId, vehicle.vehicleNumber)
  );
  await Promise.all(releasePromises);

  // Process refund if payment was successful
  let refundAmount = 0;
  if (payment.paymentStatus === "SUCCESS" && validatedData.refundAmount) {
    refundAmount = validatedData.refundAmount;
    // You can implement actual refund logic here with Razorpay
  }

  // Update booking
  const updatedBooking = await bookingCollection.findOneAndUpdate(
    { bookingId: validatedData.bookingId },
    {
      $set: {
        bookingStatus: "CANCELLED",
        "metadata.cancellationReason": validatedData.cancellationReason,
        "metadata.refundAmount": refundAmount,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return updatedBooking.value as Booking;
}

export async function getBookingByIdService(
  bookingId: string
): Promise<Booking | null> {
  const bookingCollection = await getCollection("bookings");
  return (await bookingCollection.findOne(
    { bookingId },
    { projection: { _id: 0 } }
  )) as Booking | null;
}

export async function getBookingsService(filters: BookingQueryInputType) {
  const validatedFilters = BookingQueryInput.parse(filters);
  const bookingCollection = await getCollection("bookings");

  const {
    page = 1,
    limit = 10,
    userId,
    status,
    fromDate,
    toDate,
    bikeId,
    vehicleNumber,
  } = validatedFilters;

  const matchStage: any = {};

  if (userId) matchStage.userId = userId;
  if (status) matchStage.bookingStatus = status;
  if (bikeId) matchStage["vehicles.bikeId"] = bikeId;
  if (vehicleNumber) matchStage["vehicles.vehicleNumber"] = vehicleNumber;

  if (fromDate || toDate) {
    matchStage.$and = [];
    if (fromDate) {
      matchStage.$and.push({ fromDate: { $gte: fromDate } });
    }
    if (toDate) {
      matchStage.$and.push({ toDate: { $lte: toDate } });
    }
  }

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { _id: 0 } },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await bookingCollection.aggregate(pipeline).toArray();

  const bookings = result.data || [];
  const total = result.totalCount[0]?.count || 0;

  return {
    data: bookings,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserBookingsService(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  return getBookingsService({ userId, page, limit });
}

export async function getBookingsByStatusService(
  status: "INITIATED" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED",
  page: number = 1,
  limit: number = 10
) {
  return getBookingsService({ status, page, limit });
}

// Cleanup service to release expired holds
export async function cleanupExpiredHoldsService(): Promise<{
  releasedCount: number;
}> {
  const releasedCount = await releaseExpiredHolds();

  // Also update any bookings with expired holds to CANCELLED
  const bookingCollection = await getCollection("bookings");
  const expiredTime = new Date(Date.now() - BOOK_HOLD_DURATION);

  const expiredBookings = await bookingCollection.updateMany(
    {
      bookingStatus: "INITIATED",
      createdAt: { $lt: expiredTime },
      "payment.paymentStatus": "PENDING",
    },
    {
      $set: {
        bookingStatus: "CANCELLED",
        updatedAt: new Date(),
      },
    }
  );

  return { releasedCount: releasedCount + expiredBookings.modifiedCount };
}

// Service to activate confirmed bookings on their start date
export async function activateBookingsService(): Promise<number> {
  const bookingCollection = await getCollection("bookings");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await bookingCollection.updateMany(
    {
      bookingStatus: "CONFIRMED",
      fromDate: { $lte: today },
    },
    {
      $set: {
        bookingStatus: "ACTIVE",
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

// Service to complete active bookings after their end date
export async function completeBookingsService(): Promise<number> {
  const bookingCollection = await getCollection("bookings");
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const activeBookings = await bookingCollection
    .find({
      bookingStatus: "ACTIVE",
      toDate: { $lt: today },
    })
    .toArray();

  let completedCount = 0;

  for (const booking of activeBookings) {
    // Release all vehicles
    const releasePromises = (booking as Booking).vehicles.map((vehicle) =>
      releaseBike(vehicle.bikeId, vehicle.vehicleNumber)
    );
    await Promise.all(releasePromises);

    // Update booking status
    await bookingCollection.updateOne(
      { bookingId: booking.bookingId },
      {
        $set: {
          bookingStatus: "COMPLETED",
          updatedAt: new Date(),
        },
      }
    );

    completedCount++;
  }

  return completedCount;
}
