import cloudinary from "../../config/cloudinary_config.ts";
import { uploadToCloudinary } from "../../uploadService/cloudinary_upload.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { getCollection } from "../db/database.ts";
import {
  Bike,
  CreateBikeInput,
  GetBikesInputType,
  UpdateBikeInput,
} from "./bike.model.ts";

export async function createBikeService(
  data: CreateBikeInput & { imageFile: Buffer }
): Promise<any> {
  const { brand, model, imageFile, ...rest } = data;
  const publicId = `${brand}_${model}`.toLowerCase().replace(/\s+/g, "_");
  const uploadResult: any = await uploadToCloudinary(imageFile, publicId);

  const bike = await getCollection("bikes");
  const result = await bike.insertOne({
    brand,
    model,
    ...rest,
    bikeId: generateNumericEpochId("BIKE"),
    imageUrl: uploadResult.secure_url,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return await bike.findOne({ _id: result.insertedId });
}

export async function getBikeById(id: string): Promise<Bike | null> {
  const col = await getCollection("bikes");
  return (await col.findOne(
    {
      bikeId: id,
    },
    { projection: { _id: 0, updatedAt: 0, createdAt: 0 } }
  )) as Bike | null;
}

export async function getBikesService(filters: GetBikesInputType) {
  const bikeCollection = await getCollection("bikes");
  const {
    page = 1,
    limit = 10,
    category,
    price,
    transmission,
    type,
    brand,
    model,
  } = filters;

  const matchStage: any = {};
  if (category) matchStage.category = category;
  if (transmission) matchStage.transmission = transmission;
  if (type) matchStage.type = type;
  if (brand) matchStage.brand = brand;
  if (model) matchStage.model = model;

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dayOfWeek = istDate.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $addFields: {
        price: {
          $cond: [
            isWeekend,
            { $multiply: ["$price", "$weekendVariation"] },
            "$price",
          ],
        },
      },
    },
    // Apply price filter after calculating effective price if needed
    ...(price !== undefined
      ? [{ $match: { effectivePrice: { $lte: price } } }]
      : []),
    {
      $facet: {
        // Get paginated data
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        // Get total count
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await bikeCollection.aggregate(pipeline).toArray();

  const bikes = result.data || [];
  const total = result.totalCount[0]?.count || 0;

  return {
    data: bikes,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    isWeekend, // Optional: return weekend status for debugging
  };
}

export async function deleteBikeService(bikeId: string): Promise<boolean> {
  const bikeCollection = await getCollection("bikes");
  const bike = await bikeCollection.findOne({ bikeId });
  if (!bike) throw new Error("Bike not found");
  const imageUrl: string = bike.imageUrl;
  const parts = imageUrl.split("/");
  const fileName = parts[parts.length - 1];
  const publicId = `bikes/${fileName.split(".")[0]}`;
  const result = await cloudinary.uploader.destroy(publicId);
  const bikeResult = await bikeCollection.deleteOne({ bikeId });
  if (bikeResult.deletedCount === 0 && !result.result) {
    throw new Error("Bike not found");
    return false;
  }
  return true;
}

export async function updateBikeService(data: UpdateBikeInput) {
  const bikeCollection = await getCollection("bikes");

  // 1️⃣ Find the existing bike
  const bike = await bikeCollection.findOne({ bikeId: data.bikeId });
  if (!bike) throw new Error("Bike not found");

  const updateData: any = { ...data, updatedAt: new Date() };

  if (data.imageFile) {
    const brand = data.brand || bike.brand;
    const model = data.model || bike.model;
    const publicId = `${brand}_${model}`.toLowerCase().replace(/\s+/g, "_");

    const uploadResult = await uploadToCloudinary(
      data.imageFile.buffer,
      publicId
    );

    updateData.imageUrl = uploadResult.secure_url;
  }
  delete updateData.imageFile;

  await bikeCollection.updateOne({ bikeId: data.bikeId }, { $set: updateData });

  return await bikeCollection.findOne({ bikeId: data.bikeId });
}

export const holdBike = async (
  bikeId: string,
  vehicleNumber: string,
  holdDuration: number
) => {
  const bikeCol = await getCollection("bikes");
  const holdUntil = new Date(Date.now() + holdDuration);
  await bikeCol.updateOne(
    { bikeId, "bikes.vehicleNumber": vehicleNumber },
    { $set: { "bikes.$.status": "holding", "bikes.$.holdExpires": holdUntil } }
  );
};

export const releaseExpiredHolds = async () => {
  const bikeCol = await getCollection("bikes");
  const now = new Date();
  await bikeCol.updateMany(
    { "bikes.status": "holding", "bikes.holdExpires": { $lt: now } },
    { $set: { "bikes.$.status": "available", "bikes.$.holdExpires": null } }
  );
};

export const bookBike = async (bikeId: string, vehicleNumber: string) => {
  const bikeCol = await getCollection("bikes");
  const bookedData = await bikeCol.updateOne(
    { bikeId, "bikes.vehicleNumber": vehicleNumber },
    { $set: { "bikes.$.status": "booked", "bikes.$.holdExpires": null } }
  );
  console.log("biked booked", bookedData);
  return bookedData;
};

export const releaseBike = async (bikeId: string, vehicleNumber: string) => {
  const bikeCol = await getCollection("bikes");
  await bikeCol.updateOne(
    { bikeId, "bikes.vehicleNumber": vehicleNumber },
    { $set: { "bikes.$.status": "available", "bikes.$.holdExpires": null } }
  );
};
