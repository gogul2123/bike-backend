import { z } from "zod";

const vehicleStatus = [
  "HOLDING",
  "AVAILABLE",
  "RENTED",
  "MAINTENANCE",
  "INACTIVE",
];
const conditions = ["EXCELLENT", "GOOD", "FAIR", "POOR"];
const transmission = ["gear", "automatic"];

// Individual Vehicle Schema (Physical Bike)
export const VehicleSchema = z.object({
  vehicleId: z.string().min(1, "VehicleId is required").optional(),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  status: z.enum(vehicleStatus).default("AVAILABLE"),
  condition: z.enum(conditions).default("GOOD"),
  location: z.string().optional(),
  metadata: z
    .object({
      holdExpiryTime: z
        .preprocess((v) => (v ? new Date(v as string) : undefined), z.date())
        .optional(),
      lastServiceDate: z.preprocess(
        (v) => (v ? new Date(v as string) : undefined),
        z.date().optional()
      ),
      nextServiceDue: z.preprocess(
        (v) => (v ? new Date(v as string) : undefined),
        z.date().optional()
      ),
      totalKms: z.number().nonnegative().default(0),
      purchaseDate: z.preprocess(
        (v) => (v ? new Date(v as string) : undefined),
        z.date().optional()
      ),
      lastUpdated: z
        .preprocess((v) => new Date(v as string), z.date())
        .default(() => new Date()),
    })
    .optional(),
});

export const ModelInfoSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  transmission: z.enum(transmission),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  specifications: z
    .object({
      engine: z.string().optional(),
      mileage: z.union([z.string(), z.number()]).optional(),
      fuelType: z.union([z.string(), z.number()]).optional(),
      weight: z.union([z.string(), z.number()]).optional(),
      topSpeed: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

// Pricing Schema
export const PricingSchema = z.object({
  basePrice: z.number().positive("Base price must be positive"),
  weekendMultiplier: z.number().positive().default(1.5),
  currency: z.string().default("INR"),
  taxIncluded: z.boolean().default(true),
});

// Counters Schema for quick access
export const CountersSchema = z.object({
  total: z.number().nonnegative().default(0),
  available: z.number().nonnegative().default(0),
  rented: z.number().nonnegative().default(0),
  maintenance: z.number().nonnegative().default(0),
  inactive: z.number().nonnegative().default(0),
});

// Main Bike Schema (Combined Model + Vehicles)
export const BikeSchema = z
  .object({
    bikeId: z.string().min(1, "BikeId is required"),
    modelInfo: ModelInfoSchema,
    pricing: PricingSchema,
    vehicles: z.array(VehicleSchema).default([]),
    counters: CountersSchema.default({
      total: 0,
      available: 0,
      rented: 0,
      maintenance: 0,
      inactive: 0,
    }),
    isActive: z.boolean().default(true),
    createdAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .default(() => new Date()),
    updatedAt: z
      .preprocess((v) => new Date(v as string), z.date())
      .default(() => new Date()),
  })
  .refine(
    (data) => {
      // Validate that counters match actual vehicle counts
      const statusCounts = data.vehicles.reduce(
        (acc, vehicle) => {
          const status = vehicle.status.toLowerCase() as keyof typeof acc;
          if (status in acc) {
            acc[status]++;
          }
          return acc;
        },
        { available: 0, rented: 0, maintenance: 0, inactive: 0 }
      );

      return (
        data.counters.total === data.vehicles.length &&
        data.counters.available === statusCounts.available &&
        data.counters.rented === statusCounts.rented &&
        data.counters.maintenance === statusCounts.maintenance &&
        data.counters.inactive === statusCounts.inactive
      );
    },
    {
      message: "Counter values must match actual vehicle counts",
      path: ["counters"],
    }
  );

export const CreateBikeInput = z.object({
  modelInfo: ModelInfoSchema,
  pricing: PricingSchema,
  vehicles: z.array(VehicleSchema).min(1, "At least one vehicle is required"),
});

export const UpdateBikeInput = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  modelInfo: ModelInfoSchema.partial().optional(),
  pricing: PricingSchema.partial().optional(),
  isActive: z.boolean().optional(),
  vehicles: z.array(VehicleSchema.partial()).optional(),
});

export const AddVehicleInput = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  vehicle: VehicleSchema,
});

export const UpdateVehicleStatusInput = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  status: z.enum(vehicleStatus),
  condition: z.enum(conditions).optional(),
  location: z.string().optional(),
});

export const RemoveVehicleInput = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
});

// Booking Management Input Schemas
export const BookingVehicleInput = z.object({
  bikeId: z.string().min(1, "BikeId is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
});

// Query Input Schemas
export const AvailabilityQueryInput = z
  .object({
    fromDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "fromDate is required" })
    ),
    toDate: z.preprocess(
      (v) => (v ? new Date(v as string) : undefined),
      z.date({ message: "toDate is required" })
    ),
    category: z.string().optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    location: z.string().optional(),
    transmission: z.enum(transmission).optional(),
    brand: z.string().optional(),
    minVehicles: z.number().positive().default(1),
    page: z.number().positive().default(1),
    limit: z.number().positive().default(10),
  })
  .refine((data) => data.toDate.getTime() > data.fromDate.getTime(), {
    message: "toDate must be after fromDate",
    path: ["toDate"],
  });

// Additional schemas for route validation
export const bikeIdSchema = z.object({
  bikeId: z.string().min(1, "Bike ID is required"),
});

export const vehicleNumberSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
});

export const statusQuerySchema = z.object({
  status: z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"]).optional(),
});

// File schema for validation
export const fileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
  size: z.number(),
});

// Schema with file for creation
export const CreateBikeInputWithFile = CreateBikeInput.extend({
  imageFile: fileSchema.optional(),
});

// Schema with file for update
export const UpdateBikeInputWithFile = UpdateBikeInput.extend({
  imageFile: fileSchema.optional(),
});

export interface AvailableBikeResponse {
  success: boolean;
  data: {
    bikes: Array<{
      bikeId: string;
      modelInfo: {
        brand: string;
        model: string;
        category: string;
        type: string;
        transmission: string;
        description: string;
        imageUrl: string;
        specifications: {
          engine: string;
          mileage: string;
          fuelType: string;
          weight: string;
          topSpeed: string;
        };
      };
      pricing: {
        basePrice: number;
        weekendMultiplier: number;
        currency: string;
        taxIncluded: boolean;
      };
      vehicles: Array<{
        vehicleId: string;
        vehicleNumber: string;
        status: "AVAILABLE";
        condition: string;
        location: string;
        metadata: {
          lastServiceDate: Date;
          nextServiceDue: Date;
          totalKms: number;
          purchaseDate: Date;
          lastUpdated: Date;
        };
      }>;
      availableCount: number;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  message?: string;
}

export type Bike = z.infer<typeof BikeSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type ModelInfo = z.infer<typeof ModelInfoSchema>;
export type Pricing = z.infer<typeof PricingSchema>;
export type CreateBikeInputType = z.infer<typeof CreateBikeInput>;
export type UpdateBikeInputType = z.infer<typeof UpdateBikeInput>;
export type AddVehicleInputType = z.infer<typeof AddVehicleInput>;
export type UpdateVehicleStatusInputType = z.infer<
  typeof UpdateVehicleStatusInput
>;
export type RemoveVehicleInputType = z.infer<typeof RemoveVehicleInput>;
export type AvailabilityQueryInputType = z.infer<typeof AvailabilityQueryInput>;
