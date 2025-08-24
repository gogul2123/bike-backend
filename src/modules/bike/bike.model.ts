import { z } from "zod";

const SingleBikeSchema = z.object({
  vehicleNumber: z.string(),
  color: z.string(),
  status: z.string(),
});

export const bikeSchema = z.object({
  bikeId: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  type: z.string(),
  availability: z.boolean(),
  price: z.number().nonnegative(),
  description: z.string(),
  imageUrl: z.string().url().optional(),
  transmission: z.enum(["gear", "automatic"]),
  createdAt: z.preprocess((v) => new Date(v as string), z.date()),
  updatedAt: z.preprocess((v) => new Date(v as string), z.date()),
  bikes: z.array(SingleBikeSchema),
  weekendVariation: z.number().nonnegative().default(2),
});

export const createBikeSchema = bikeSchema.omit({
  bikeId: true,
  createdAt: true,
  updatedAt: true,
  imageUrl: true,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const createBikeSchemaWithFile = createBikeSchema.extend({
  imageFile: z.object({
    buffer: z.instanceof(Buffer),
    originalname: z.string(),
    mimetype: z.string(),
    size: z.number(),
  }),
});

const updateBikeSchema = bikeSchema.partial();
export const updateBikeSchemaWithFile = updateBikeSchema.extend({
  bikeId: z.string(),
  imageFile: z
    .object({
      buffer: z.instanceof(Buffer),
      originalname: z.string(),
      mimetype: z.string(),
      size: z.number(),
    })
    .optional(),
});

export const bikeIdSchema = z.object({
  bikeId: z.string(),
});

export const GetBikesInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  category: z.string().optional(),
  price: z.number().optional(),
  transmission: z.enum(["gear", "automatic"]).optional(),
  type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
});

export type UpdateBikeInput = z.infer<typeof updateBikeSchemaWithFile>;
export type GetBikesInputType = z.infer<typeof GetBikesInput>;
export type bikeIdInput = z.infer<typeof bikeIdSchema>;
export type CreateBikeInput = z.infer<typeof createBikeSchemaWithFile>;
export type Bike = z.infer<typeof bikeSchema>;
