import { z } from "zod";

export const BikeSchema = z.object({
  _id: z.string(), // e.g. Mongo ObjectID as string
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  type: z.string(),
  availability: z.boolean(),
  price: z.number().nonnegative(),
  description: z.string(),
  colors: z.array(z.string()),
  inventory: z.object({
    total: z.number().int().nonnegative(),
    byColor: z.record(z.string(), z.number().int().nonnegative()),
  }),
  imageUrl: z.string().url().optional(),
  transmission: z.enum(["gear", "automatic"]),
  createdAt: z.preprocess((v) => new Date(v as string), z.date()),
  updatedAt: z.preprocess((v) => new Date(v as string), z.date()),
});

export type Bike = z.infer<typeof BikeSchema>;
