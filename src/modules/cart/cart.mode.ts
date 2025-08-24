import { z } from "zod";
import { ObjectId } from "mongodb";

export const cartItemSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.string().nonempty("User ID is required"),
  bikeId: z.string().nonempty("Bike ID is required"),
  vehicleNumber: z.string().nonempty("Bike number is required"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type CartItem = z.infer<typeof cartItemSchema>;
