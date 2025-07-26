import { email, z } from "zod";

export const updateUserSchemaZ = z.object({
  userId: z.string().nonempty("User ID is required."),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long.")
    .regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces.")
    .nonempty("Name is required."),
  email: z.email().nonempty("email is required"),
});

export type UpdateUserInput = z.infer<typeof updateUserSchemaZ>;
