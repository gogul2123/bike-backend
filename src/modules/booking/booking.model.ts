import { z } from "zod";
import { BookingVehicleInput } from "../bike/bike.model.ts";

const bookingStatus = [
  "INITIATED",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

export const BookingVehicleSchema = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  modelName: z.string().min(1, "Model name is required"), // Denormalized for quick access
  brand: z.string().min(1, "Brand is required"), // Denormalized for quick access
  category: z.string().min(1, "Category is required"), // Denormalized for quick access
  basePrice: z.number().positive("Base price must be positive"), // Denormalized for quick access
  weekendMultiplier: z.number().positive().default(1.5),
  currency: z.string().default("INR"),
});

export const BookingById = z.object({
  bookingId: z.string().min(1, "BookingId is required"),
});

export const ItemPricingBreakdownSchema = z.object({
  bikeId: z.string().min(1),
  vehicleNumber: z.string().min(1),
  baseAmount: z.number().nonnegative(),
  weekendAmount: z.number().nonnegative(),
  subtotal: z.number().positive(),
  weekdayCount: z.number().nonnegative(),
  weekendCount: z.number().nonnegative(),
});

export const PricingBreakdownSchema = z.object({
  // items: z
  //   .array(ItemPricingBreakdownSchema)
  //   .min(1, "At least one item is required"),
  totalBaseAmount: z.number().nonnegative(),
  totalWeekendAmount: z.number().nonnegative(),
  subtotalAmount: z.number().positive(),
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive(),
  totalDays: z.number().positive(),
  totalWeekdayCount: z.number().nonnegative(),
  totalWeekendCount: z.number().nonnegative(),
  currency: z.string().default("INR"),
});

export const BookingSchema = z
  .object({
    bookingId: z.string().min(1, "BookingId is required").optional(),
    userId: z.string().min(1, "UserId is required"),
    vehicles: z
      .array(BookingVehicleSchema)
      .min(1, "At least one vehicle is required"),
    fromDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "fromDate is required and must be a valid date" })
    ),
    toDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "toDate is required and must be a valid date" })
    ),
    totalDays: z.number().positive().optional(),
    pricing: PricingBreakdownSchema,
    bookingStatus: z.enum(bookingStatus).default("INITIATED"),
    features: z
      .object({
        pickupLocation: z.string().optional(),
        dropLocation: z.string().optional(),
        specialRequests: z.string().optional(),
        insuranceIncluded: z.boolean().default(false),
        deliveryRequired: z.boolean().default(false),
        deliveryAddress: z.string().optional(),
        emergencyContact: z.string().optional(),
      })
      .optional(),
    metadata: z
      .object({
        totalVehicles: z.number().positive().default(1),
        differentModels: z.number().positive().default(1),
        isMultiModel: z.boolean().default(false),
        customerNotes: z.string().optional(),
        internalNotes: z.string().optional(),
      })
      .optional(),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .default(() => new Date()),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .default(() => new Date()),
  })
  .refine((data) => data.toDate.getTime() > data.fromDate.getTime(), {
    message: "toDate must be after fromDate",
    path: ["toDate"],
  })
  .refine(
    (data) => {
      const now = new Date();
      const maxBookingDate = new Date();
      maxBookingDate.setDate(now.getDate() + 30);
      return data.fromDate <= maxBookingDate;
    },
    {
      message: "Booking can only be made up to 30 days in advance",
      path: ["fromDate"],
    }
  )
  .refine(
    (data) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const fromDate = new Date(data.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      return fromDate >= now;
    },
    {
      message: "Booking cannot be made for past dates",
      path: ["fromDate"],
    }
  )
  .refine(
    (data) => {
      const vehicleNumbers = data.vehicles.map((v) => v.vehicleNumber);
      const uniqueNumbers = new Set(vehicleNumbers);
      return uniqueNumbers.size === vehicleNumbers.length;
    },
    {
      message: "All vehicle numbers must be unique in a booking",
      path: ["vehicles"],
    }
  );
// .refine(
//   (data) => {
//     return data.pricing.items.length === data.vehicles.length;
//   },
//   {
//     message: "Pricing items must match the number of vehicles",
//     path: ["pricing"],
//   }
// );

export const CreateBookingInput = z
  .object({
    userId: z.string().min(1, "UserId is required"),
    vehicles: z
      .array(BookingVehicleInput)
      .min(1, "At least one vehicle is required"),
    fromDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "fromDate is required" })
    ),
    toDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "toDate is required" })
    ),
    features: z
      .object({
        pickupLocation: z.string().optional(),
        dropLocation: z.string().optional(),
        specialRequests: z.string().optional(),
        insuranceIncluded: z.boolean().default(false),
        deliveryRequired: z.boolean().default(false),
        deliveryAddress: z.string().optional(),
        emergencyContact: z.string().optional(),
      })
      .optional(),
    customerNotes: z.string().optional(),
  })
  .refine((data) => data.toDate.getTime() > data.fromDate.getTime(), {
    message: "toDate must be after fromDate",
    path: ["toDate"],
  })
  .refine(
    (data) => {
      // Validate unique vehicle selections
      const selections = data.vehicles.map(
        (v) => `${v.bikeId}-${v.vehicleNumber}`
      );
      const uniqueSelections = new Set(selections);
      return uniqueSelections.size === selections.length;
    },
    {
      message: "Cannot book the same vehicle multiple times",
      path: ["vehicles"],
    }
  );

export const UpdateBookingInput = z.object({
  bookingId: z.string().min(1, "BookingId is required"),
  bookingStatus: z.enum(bookingStatus).optional(),
  features: z
    .object({
      pickupLocation: z.string().optional(),
      dropLocation: z.string().optional(),
      specialRequests: z.string().optional(),
      insuranceIncluded: z.boolean().optional(),
      deliveryRequired: z.boolean().optional(),
      deliveryAddress: z.string().optional(),
      emergencyContact: z.string().optional(),
    })
    .partial()
    .optional(),
  internalNotes: z.string().optional(),
});

export const CancelBookingInput = z.object({
  bookingId: z.string().min(1, "BookingId is required"),
  cancellationReason: z.string().min(1, "Cancellation reason is required"),
  refundAmount: z.number().nonnegative().optional(),
});

export const BookingQueryInput = z.object({
  userId: z.string().optional(),
  status: z.enum(bookingStatus).optional(),
  fromDate: z.preprocess(
    (v) => (v ? new Date(v as string) : undefined),
    z.date().optional()
  ),
  toDate: z.preprocess(
    (v) => (v ? new Date(v as string) : undefined),
    z.date().optional()
  ),
  bikeId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
});

export const completeBookingSchema = z.object({
  bookingId: z.string().min(1, "BookingId is required"),
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
});

// Query parameters schema
export const paginationQuerySchema = z
  .object({
    page: z.string().optional().default("1").transform(Number),
    limit: z.string().optional().default("10").transform(Number),
  })
  .refine((data) => data.page > 0, {
    message: "Page must be greater than 0",
    path: ["page"],
  })
  .refine((data) => data.limit > 0 && data.limit <= 100, {
    message: "Limit must be between 1 and 100",
    path: ["limit"],
  });

// Request parameters schemas
export const userBookingsParamsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const bookingsByStatusParamsSchema = z.object({
  status: z.enum(bookingStatus),
});

// Combined validation schemas for each endpoint
export const getUserBookingsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("10").transform(Number),
});

export const getBookingsByStatusSchema = z.object({
  status: z.enum(bookingStatus),
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("10").transform(Number),
});

export type Booking = z.infer<typeof BookingSchema>;
export type BookingVehicle = z.infer<typeof BookingVehicleSchema>;
export type PricingBreakdown = z.infer<typeof PricingBreakdownSchema>;
export type ItemPricingBreakdown = z.infer<typeof ItemPricingBreakdownSchema>;

export type CreateBookingInputType = z.infer<typeof CreateBookingInput>;
export type UpdateBookingInputType = z.infer<typeof UpdateBookingInput>;
export type CancelBookingInputType = z.infer<typeof CancelBookingInput>;
export type BookingQueryInputType = z.infer<typeof BookingQueryInput>;
