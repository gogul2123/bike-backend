import cloudinary from "../../config/cloudinary_config.ts";
import { uploadToCloudinary } from "../../uploadService/cloudinary_upload.ts";
import { updateCounters } from "../../utils/bike.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { getCollection } from "../db/database.ts";
import {
  Bike,
  CreateBikeInputType,
  UpdateBikeInputType,
  AddVehicleInputType,
  UpdateVehicleStatusInputType,
  RemoveVehicleInputType,
  AvailabilityQueryInputType,
  Vehicle,
  BikeSchema,
  CreateBikeInput,
  UpdateBikeInput,
  AddVehicleInput,
  UpdateVehicleStatusInput,
  RemoveVehicleInput,
  AvailabilityQueryInput,
} from "./bike.model.ts";

// Helper function to update counters based on vehicle statuses

export async function createBikeService(
  data: CreateBikeInputType & { imageFile?: Buffer }
): Promise<Bike> {
  const validatedData = CreateBikeInput.parse(data);

  let imageUrl: string | undefined;

  if (data.imageFile) {
    const { brand, model } = validatedData.modelInfo;
    const publicId = `bikes/${brand}_${model}`
      .toLowerCase()
      .replace(/\s+/g, "_");
    const uploadResult: any = await uploadToCloudinary(
      data.imageFile,
      publicId
    );
    imageUrl = uploadResult.secure_url;
  }

  // Calculate counters from vehicles
  const counters = updateCounters(validatedData.vehicles);

  const bikeData: Omit<Bike, "bikeId"> & { bikeId?: string } = {
    bikeId: generateNumericEpochId("BIKE"),
    modelInfo: {
      ...validatedData.modelInfo,
      imageUrl: imageUrl || validatedData.modelInfo.imageUrl,
    },
    pricing: validatedData.pricing,
    vehicles: validatedData.vehicles.map((vehicle) => ({
      ...vehicle,
      vehicleId: vehicle.vehicleId || generateNumericEpochId("VEH"),
      metadata: {
        ...vehicle.metadata,
        lastUpdated: new Date(),
      },
    })) as unknown as typeof validatedData.vehicles,
    counters,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validatedBike = BikeSchema.parse(bikeData);
  const bikeCollection = await getCollection("bikes");
  const result = await bikeCollection.insertOne(validatedBike);
  const createdBike = await bikeCollection.findOne(
    { _id: result.insertedId },
    { projection: { _id: 0 } }
  );

  return createdBike as Bike;
}

export async function getBikeById(bikeId: string): Promise<Bike | null> {
  const bikeCollection = await getCollection("bikes");
  return (await bikeCollection.findOne(
    { bikeId },
    { projection: { _id: 0 } }
  )) as Bike | null;
}

export async function getBikesByIds(bikeIds: string[]): Promise<Bike[]> {
  const col = await getCollection("bikes");
  return await col
    .find(
      { bikeId: { $in: bikeIds } },
      { projection: { _id: 0, pricing: 1, vehicles: 1 } }
    )
    .toArray();
}

export async function getBikesService(filters: {
  page?: number;
  limit?: number;
  category?: string;
  transmission?: "gear" | "automatic";
  type?: string;
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  isActive?: boolean;
}) {
  const bikeCollection = await getCollection("bikes");
  const {
    page = 1,
    limit = 10,
    category,
    transmission,
    type,
    brand,
    model,
    minPrice,
    maxPrice,
    location,
    isActive = true,
  } = filters;

  const matchStage: any = { isActive };

  // Filter by model info fields
  if (category) matchStage["modelInfo.category"] = category;
  if (transmission) matchStage["modelInfo.transmission"] = transmission;
  if (type) matchStage["modelInfo.type"] = type;
  if (brand) matchStage["modelInfo.brand"] = brand;
  if (model) matchStage["modelInfo.model"] = model;
  if (location) matchStage["vehicles.location"] = location;

  // Calculate weekend pricing
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dayOfWeek = istDate.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $addFields: {
        effectivePrice: {
          $cond: [
            isWeekend,
            { $multiply: ["$pricing.basePrice", "$pricing.weekendMultiplier"] },
            "$pricing.basePrice",
          ],
        },
      },
    },
  ];

  // Apply price filters if provided
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceMatch: any = {};
    if (minPrice !== undefined) priceMatch.effectivePrice = { $gte: minPrice };
    if (maxPrice !== undefined) {
      priceMatch.effectivePrice = {
        ...priceMatch.effectivePrice,
        $lte: maxPrice,
      };
    }
    pipeline.push({ $match: priceMatch });
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _id: 0 } },
      ],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await bikeCollection.aggregate(pipeline).toArray();

  const bikes = result.data || [];
  const total = result.totalCount[0]?.count || 0;

  return {
    data: bikes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    isWeekend,
  };
}

export async function updateBikeService(
  data: UpdateBikeInputType & { imageFile?: Buffer }
): Promise<Bike> {
  // Validate input
  const validatedData = UpdateBikeInput.parse(data);

  const bikeCollection = await getCollection("bikes");

  // Find the existing bike
  const existingBike = await bikeCollection.findOne({
    bikeId: validatedData.bikeId,
  });
  if (!existingBike) throw new Error("Bike not found");

  const updateData: any = {
    updatedAt: new Date(),
  };

  // Update model info if provided
  if (validatedData.modelInfo) {
    updateData["modelInfo"] = {
      ...existingBike.modelInfo,
      ...validatedData.modelInfo,
    };

    // Handle image upload if new image file is provided
    if (data.imageFile) {
      const brand =
        validatedData.modelInfo.brand || existingBike.modelInfo.brand;
      const model =
        validatedData.modelInfo.model || existingBike.modelInfo.model;
      const publicId = `bikes/${brand}_${model}`
        .toLowerCase()
        .replace(/\s+/g, "_");

      const uploadResult = await uploadToCloudinary(data.imageFile, publicId);
      updateData["modelInfo.imageUrl"] = uploadResult.secure_url;
    }
  }

  // Update pricing if provided
  if (validatedData.pricing) {
    updateData["pricing"] = {
      ...existingBike.pricing,
      ...validatedData.pricing,
    };
  }

  if (validatedData.isActive !== undefined) {
    updateData.isActive = validatedData.isActive;
  }

  if (validatedData.vehicles) {
    const updatedVehicles = validatedData.vehicles.map((vehicle) => ({
      ...vehicle,
      vehicleId: vehicle.vehicleId || generateNumericEpochId("VEH"),
      metadata: {
        ...vehicle.metadata,
        lastUpdated: new Date(),
      },
    }));

    updateData.vehicles = updatedVehicles;
    updateData.counters = updateCounters(updatedVehicles as Vehicle[]);
  }

  await bikeCollection.updateOne(
    { bikeId: validatedData.bikeId },
    { $set: updateData }
  );

  const updatedBike = await bikeCollection.findOne(
    { bikeId: validatedData.bikeId },
    { projection: { _id: 0 } }
  );

  return updatedBike as Bike;
}

export async function deleteBikeService(bikeId: string): Promise<boolean> {
  const bikeCollection = await getCollection("bikes");
  const bike = await bikeCollection.findOne({ bikeId });

  if (!bike) throw new Error("Bike not found");
  if (bike.modelInfo?.imageUrl) {
    try {
      const imageUrl: string = bike.modelInfo.imageUrl;
      const parts = imageUrl.split("/");
      const fileName = parts[parts.length - 1];
      const publicId = `bikes/${fileName.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Error deleting image from cloudinary:", error);
    }
  }

  const result = await bikeCollection.deleteOne({ bikeId });
  return result.deletedCount > 0;
}

export async function addVehicleService(
  data: AddVehicleInputType
): Promise<Bike> {
  const validatedData = AddVehicleInput.parse(data);
  const bikeCollection = await getCollection("bikes");

  const existingBike = await bikeCollection.findOne({
    bikeId: validatedData.bikeId,
  });
  if (!existingBike) throw new Error("Bike not found");

  // Check if vehicle number already exists
  const vehicleExists = existingBike.vehicles?.some(
    (v: Vehicle) => v.vehicleNumber === validatedData.vehicle.vehicleNumber
  );
  if (vehicleExists) {
    throw new Error("Vehicle with this number already exists");
  }

  const newVehicle = {
    ...validatedData.vehicle,
    vehicleId: validatedData.vehicle.vehicleId || generateNumericEpochId("VEH"),
    metadata: {
      ...validatedData.vehicle.metadata,
      lastUpdated: new Date(),
    },
  };

  const updatedVehicles = [...(existingBike.vehicles || []), newVehicle];
  const newCounters = updateCounters(updatedVehicles);

  await bikeCollection.updateOne(
    { bikeId: validatedData.bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  const updatedBike = await bikeCollection.findOne(
    { bikeId: validatedData.bikeId },
    { projection: { _id: 0 } }
  );

  return updatedBike as Bike;
}

export async function updateVehicleStatusService(
  data: UpdateVehicleStatusInputType
): Promise<Bike> {
  const validatedData = UpdateVehicleStatusInput.parse(data);
  const bikeCollection = await getCollection("bikes");

  const existingBike = await bikeCollection.findOne({
    bikeId: validatedData.bikeId,
  });
  if (!existingBike) throw new Error("Bike not found");

  const vehicleIndex = existingBike.vehicles?.findIndex(
    (v: Vehicle) => v.vehicleNumber === validatedData.vehicleNumber
  );

  if (vehicleIndex === -1 || vehicleIndex === undefined) {
    throw new Error("Vehicle not found");
  }

  const updatedVehicles = [...existingBike.vehicles];
  updatedVehicles[vehicleIndex] = {
    ...updatedVehicles[vehicleIndex],
    status: validatedData.status,
    ...(validatedData.condition && { condition: validatedData.condition }),
    ...(validatedData.location && { location: validatedData.location }),
    metadata: {
      ...updatedVehicles[vehicleIndex].metadata,
      lastUpdated: new Date(),
    },
  };

  const newCounters = updateCounters(updatedVehicles);

  await bikeCollection.updateOne(
    { bikeId: validatedData.bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  const updatedBike = await bikeCollection.findOne(
    { bikeId: validatedData.bikeId },
    { projection: { _id: 0 } }
  );

  return updatedBike as Bike;
}

export async function removeVehicleService(
  data: RemoveVehicleInputType
): Promise<Bike> {
  const validatedData = RemoveVehicleInput.parse(data);
  const bikeCollection = await getCollection("bikes");

  const existingBike = await bikeCollection.findOne({
    bikeId: validatedData.bikeId,
  });
  if (!existingBike) throw new Error("Bike not found");

  const updatedVehicles = existingBike.vehicles?.filter(
    (v: Vehicle) => v.vehicleNumber !== validatedData.vehicleNumber
  );

  if (updatedVehicles?.length === existingBike.vehicles?.length) {
    throw new Error("Vehicle not found");
  }

  const newCounters = updateCounters(updatedVehicles || []);

  await bikeCollection.updateOne(
    { bikeId: validatedData.bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  const updatedBike = await bikeCollection.findOne(
    { bikeId: validatedData.bikeId },
    { projection: { _id: 0 } }
  );

  return updatedBike as Bike;
}

// Availability Services

export async function checkAvailabilityService(
  query: AvailabilityQueryInputType
): Promise<Bike[]> {
  const validatedQuery = AvailabilityQueryInput.parse(query);
  const bikeCollection = await getCollection("bikes");

  const matchStage: any = {
    isActive: true,
    "counters.available": { $gte: validatedQuery.minVehicles },
  };

  if (validatedQuery.category)
    matchStage["modelInfo.category"] = validatedQuery.category;
  if (validatedQuery.transmission)
    matchStage["modelInfo.transmission"] = validatedQuery.transmission;
  if (validatedQuery.brand)
    matchStage["modelInfo.brand"] = validatedQuery.brand;
  if (validatedQuery.location)
    matchStage["vehicles.location"] = validatedQuery.location;

  // Calculate weekend pricing for the query period
  const isWeekendPeriod = [validatedQuery.fromDate, validatedQuery.toDate].some(
    (date) => {
      const dayOfWeek = date.getUTCDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    }
  );

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $addFields: {
        effectivePrice: {
          $cond: [
            isWeekendPeriod,
            { $multiply: ["$pricing.basePrice", "$pricing.weekendMultiplier"] },
            "$pricing.basePrice",
          ],
        },
      },
    },
  ];

  // Apply price filters
  if (
    validatedQuery.minPrice !== undefined ||
    validatedQuery.maxPrice !== undefined
  ) {
    const priceMatch: any = {};
    if (validatedQuery.minPrice !== undefined) {
      priceMatch.effectivePrice = { $gte: validatedQuery.minPrice };
    }
    if (validatedQuery.maxPrice !== undefined) {
      priceMatch.effectivePrice = {
        ...priceMatch.effectivePrice,
        $lte: validatedQuery.maxPrice,
      };
    }
    pipeline.push({ $match: priceMatch });
  }

  pipeline.push({ $sort: { effectivePrice: 1 } }, { $project: { _id: 0 } });

  const availableBikes = await bikeCollection.aggregate(pipeline).toArray();
  return availableBikes as Bike[];
}

export async function getVehiclesByStatusService(
  bikeId: string,
  status?: "AVAILABLE" | "RENTED" | "MAINTENANCE" | "INACTIVE"
): Promise<Vehicle[]> {
  const bikeCollection = await getCollection("bikes");

  // Build aggregation pipeline
  const pipeline: any[] = [
    { $match: { bikeId } },
    { $unwind: "$vehicles" }, // Unwind the vehicles array
  ];

  // Add status filter if provided
  if (status) {
    pipeline.push({
      $match: { "vehicles.status": status },
    });
  }

  // Project to reshape the document or replaceRoot to get just vehicles
  pipeline.push({
    $replaceRoot: { newRoot: "$vehicles" },
  });

  const vehicles = await bikeCollection.aggregate(pipeline).toArray();

  if (vehicles.length === 0 && status) {
    // Optional: Check if bike exists but no vehicles match the status
    const bikeExists = await bikeCollection.findOne({ bikeId });
    if (!bikeExists) throw new Error("Bike not found");
  }

  return vehicles as Vehicle[];
}

export async function holdBike(
  bikeId: string,
  vehicleNumber: string,
  holdDurationMs: number
): Promise<boolean> {
  const bikeCollection = await getCollection("bikes");

  // Find the bike and check if vehicle is available
  const bike = await bikeCollection.findOne({ bikeId });
  if (!bike) throw new Error("Bike not found");

  const vehicleIndex = bike.vehicles?.findIndex(
    (v: Vehicle) => v.vehicleNumber === vehicleNumber
  );

  if (vehicleIndex === -1 || vehicleIndex === undefined) {
    throw new Error("Vehicle not found");
  }

  const vehicle = bike.vehicles[vehicleIndex];
  if (vehicle.status !== "AVAILABLE") {
    throw new Error("Vehicle is not available for booking");
  }

  // Set hold expiry time
  const holdExpiryTime = new Date(Date.now() + holdDurationMs);

  const updatedVehicles = [...bike.vehicles];
  updatedVehicles[vehicleIndex] = {
    ...vehicle,
    status: "RENTED", // Temporarily mark as rented during hold
    metadata: {
      ...vehicle.metadata,
      holdExpiryTime,
      lastUpdated: new Date(),
    },
  };

  const newCounters = updateCounters(updatedVehicles);

  const result = await bikeCollection.updateOne(
    { bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function holdMultipleVehicles(
  vehicles: Array<{ bikeId: string; vehicleNumber: string }>,
  holdDurationMs: number,
  userId?: string | null
): Promise<{
  success: boolean;
  failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }>;
}> {
  const bikeCollection = await getCollection("bikes");
  const holdExpiryTime = new Date(Date.now() + holdDurationMs);
  const currentDate = new Date();

  const failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }> = [];

  try {
    // Group by bikeId for more efficient updates
    const vehiclesByBikeId = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.bikeId]) {
        acc[vehicle.bikeId] = [];
      }
      acc[vehicle.bikeId].push(vehicle.vehicleNumber);
      return acc;
    }, {} as Record<string, string[]>);

    // Update each bike with multiple vehicles in one operation
    for (const [bikeId, vehicleNumbers] of Object.entries(vehiclesByBikeId)) {
      const result = await bikeCollection.updateOne(
        {
          bikeId,
          "vehicles.vehicleNumber": { $in: vehicleNumbers },
          "vehicles.status": "AVAILABLE",
        },
        {
          $set: {
            "vehicles.$[elem].status": "HOLDING",
            "vehicles.$[elem].metadata.holdExpiryTime": holdExpiryTime,
            "vehicles.$[elem].metadata.holdedBy": userId,
            "vehicles.$[elem].metadata.lastUpdated": currentDate,
            updatedAt: currentDate,
          },
        },
        {
          arrayFilters: [
            {
              "elem.vehicleNumber": { $in: vehicleNumbers },
              "elem.status": "AVAILABLE",
            },
          ],
        }
      );

      // Check if update was successful
      if (result.modifiedCount === 0) {
        vehicleNumbers.forEach((vehicleNumber) => {
          failedVehicles.push({
            bikeId,
            vehicleNumber,
            error: "Vehicle not available or update failed",
          });
        });
      }
    }
  } catch (error) {
    vehicles.forEach((vehicle) => {
      failedVehicles.push({
        bikeId: vehicle.bikeId,
        vehicleNumber: vehicle.vehicleNumber,
        error: "Database operation failed",
      });
    });
  }

  return {
    success: failedVehicles.length === 0,
    failedVehicles,
  };
}

export async function bookMultipleVehicles(
  vehicles: Array<{ bikeId: string; vehicleNumber: string }>,
  holdDurationMs: number,
  userId?: string | null
): Promise<{
  success: boolean;
  failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }>;
}> {
  const bikeCollection = await getCollection("bikes");
  const holdExpiryTime = new Date(Date.now() + holdDurationMs);
  const currentDate = new Date();

  const failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }> = [];

  try {
    // Group by bikeId for more efficient updates
    const vehiclesByBikeId = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.bikeId]) {
        acc[vehicle.bikeId] = [];
      }
      acc[vehicle.bikeId].push(vehicle.vehicleNumber);
      return acc;
    }, {} as Record<string, string[]>);

    // Update each bike with multiple vehicles in one operation
    for (const [bikeId, vehicleNumbers] of Object.entries(vehiclesByBikeId)) {
      const result = await bikeCollection.updateOne(
        {
          bikeId,
          "vehicles.vehicleNumber": { $in: vehicleNumbers },
          "vehicles.status": "HOLDING",
          "vehicles.metadata.holdedBy": userId,
        },
        {
          $set: {
            "vehicles.$[elem].status": "RENTED",
            "vehicles.$[elem].metadata.holdExpiryTime": holdExpiryTime,
            "vehicles.$[elem].metadata.lastUpdated": currentDate,
            updatedAt: currentDate,
          },
        },
        {
          arrayFilters: [
            {
              "elem.vehicleNumber": { $in: vehicleNumbers },
              "elem.status": "HOLDING",
              "elem.metadata.holdedBy": userId,
            },
          ],
        }
      );

      // Check if update was successful
      if (result.modifiedCount === 0) {
        vehicleNumbers.forEach((vehicleNumber) => {
          failedVehicles.push({
            bikeId,
            vehicleNumber,
            error: "Vehicle not available or update failed",
          });
        });
      }
    }
  } catch (error) {
    vehicles.forEach((vehicle) => {
      failedVehicles.push({
        bikeId: vehicle.bikeId,
        vehicleNumber: vehicle.vehicleNumber,
        error: "Database operation failed",
      });
    });
  }

  return {
    success: failedVehicles.length === 0,
    failedVehicles,
  };
}

export async function bookBike(
  bikeId: string,
  vehicleNumber: string
): Promise<boolean> {
  const bikeCollection = await getCollection("bikes");

  const bike = await bikeCollection.findOne({ bikeId });
  if (!bike) throw new Error("Bike not found");

  const vehicleIndex = bike.vehicles?.findIndex(
    (v: Vehicle) => v.vehicleNumber === vehicleNumber
  );

  if (vehicleIndex === -1 || vehicleIndex === undefined) {
    throw new Error("Vehicle not found");
  }

  const vehicle = bike.vehicles[vehicleIndex];

  const updatedVehicles = [...bike.vehicles];
  updatedVehicles[vehicleIndex] = {
    ...vehicle,
    status: "RENTED",
    metadata: {
      ...vehicle.metadata,
      lastUpdated: new Date(),
      // Remove hold expiry time as it's now confirmed
      holdExpiryTime: undefined,
    },
  };

  const newCounters = updateCounters(updatedVehicles);

  const result = await bikeCollection.updateOne(
    { bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function releaseBike(
  bikeId: string,
  vehicleNumber: string
): Promise<boolean> {
  const bikeCollection = await getCollection("bikes");

  const bike = await bikeCollection.findOne({ bikeId });
  if (!bike) throw new Error("Bike not found");

  const vehicleIndex = bike.vehicles?.findIndex(
    (v: Vehicle) => v.vehicleNumber === vehicleNumber
  );

  if (vehicleIndex === -1 || vehicleIndex === undefined) {
    throw new Error("Vehicle not found");
  }

  const vehicle = bike.vehicles[vehicleIndex];

  const updatedVehicles = [...bike.vehicles];
  updatedVehicles[vehicleIndex] = {
    ...vehicle,
    status: "AVAILABLE",
    metadata: {
      ...vehicle.metadata,
      lastUpdated: new Date(),
      // Remove hold expiry time
      holdExpiryTime: undefined,
    },
  };

  const newCounters = updateCounters(updatedVehicles);

  const result = await bikeCollection.updateOne(
    { bikeId },
    {
      $set: {
        vehicles: updatedVehicles,
        counters: newCounters,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function releaseMultipleVehicles(
  vehicles: Array<{ bikeId: string; vehicleNumber: string }>,
  holdDurationMs: number,
  userId?: string | null
): Promise<{
  success: boolean;
  failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }>;
}> {
  const bikeCollection = await getCollection("bikes");
  const holdExpiryTime = new Date(Date.now() + holdDurationMs);
  const currentDate = new Date();

  const failedVehicles: Array<{
    bikeId: string;
    vehicleNumber: string;
    error: string;
  }> = [];

  try {
    // Group by bikeId for more efficient updates
    const vehiclesByBikeId = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.bikeId]) {
        acc[vehicle.bikeId] = [];
      }
      acc[vehicle.bikeId].push(vehicle.vehicleNumber);
      return acc;
    }, {} as Record<string, string[]>);

    // Update each bike with multiple vehicles in one operation
    for (const [bikeId, vehicleNumbers] of Object.entries(vehiclesByBikeId)) {
      const result = await bikeCollection.updateOne(
        {
          bikeId,
          "vehicles.vehicleNumber": { $in: vehicleNumbers },
          "vehicles.status": "HOLDING",
          "vehicles.metadata.holdedBy": userId,
        },
        {
          $set: {
            "vehicles.$[elem].status": "AVAILABLE",
            "vehicles.$[elem].metadata.lastUpdated": currentDate,
            updatedAt: currentDate,
          },
          $unset: {
            "vehicles.$[elem].metadata.holdExpiryTime": "",
            "vehicles.$[elem].metadata.holdedBy": "",
          },
        },
        {
          arrayFilters: [
            {
              "elem.vehicleNumber": { $in: vehicleNumbers },
              "elem.status": "HOLDING",
              "elem.metadata.holdedBy": userId,
            },
          ],
        }
      );

      // Check if update was successful
      if (result.modifiedCount === 0) {
        vehicleNumbers.forEach((vehicleNumber) => {
          failedVehicles.push({
            bikeId,
            vehicleNumber,
            error: "Vehicle not available or update failed",
          });
        });
      }
    }
  } catch (error) {
    vehicles.forEach((vehicle) => {
      failedVehicles.push({
        bikeId: vehicle.bikeId,
        vehicleNumber: vehicle.vehicleNumber,
        error: "Database operation failed",
      });
    });
  }

  return {
    success: failedVehicles.length === 0,
    failedVehicles,
  };
}

export async function releaseExpiredHolds(): Promise<number> {
  const bikeCollection = await getCollection("bikes");
  const now = new Date();

  // Find all bikes with vehicles that have expired holds
  const bikesWithExpiredHolds = await bikeCollection
    .find({
      "vehicles.metadata.holdExpiryTime": { $lt: now },
    })
    .toArray();

  let releasedCount = 0;

  for (const bike of bikesWithExpiredHolds) {
    let vehiclesUpdated = false;
    const updatedVehicles = bike.vehicles.map((vehicle: Vehicle) => {
      if (
        vehicle.metadata?.holdExpiryTime &&
        vehicle.metadata.holdExpiryTime < now
      ) {
        vehiclesUpdated = true;
        releasedCount++;
        return {
          ...vehicle,
          status: "AVAILABLE",
          metadata: {
            ...vehicle.metadata,
            holdExpiryTime: undefined,
            lastUpdated: new Date(),
          },
        };
      }
      return vehicle;
    });

    if (vehiclesUpdated) {
      const newCounters = updateCounters(updatedVehicles);
      await bikeCollection.updateOne(
        { bikeId: bike.bikeId },
        {
          $set: {
            vehicles: updatedVehicles,
            counters: newCounters,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  return releasedCount;
}
