import { email, z } from "zod";
import { ObjectId } from "mongodb";
import { stat } from "fs";

export const updateUserSchemaZ = z.object({
  userId: z.string().nonempty("User ID is required."),
  email: z.string().email("Invalid email address.").optional(),
  role: z.enum(["user"]).optional(),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long.")
    .regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces.")
    .optional(),
  mobile: z
    .string()
    .min(10, "Phone number must be at least 10 characters long.")
    .regex(/^[0-9]+$/, "Phone number must contain only digits")
    .optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
});

export const updateInitialDataSchemaZ = z.object({
  userId: z.string().nonempty("User ID is required."),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  mobile: z
    .string()
    .min(10)
    .regex(/^[0-9]+$/, "Phone number must contain only digits"),
});

export const userSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).optional(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).default("user"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// For normal sign-up
export const signUpSchema = userSchema.pick({
  email: true,
  name: true,
  mobile: true,
  password: true,
});

export const googleAuthSchema = z.object({
  token: z.string().min(1),
  accessToken: z.string().min(1),
});

export const getUser = z.object({
  userId: z.string().nonempty("User ID is required."),
});

export const searchUUsers = z.object({
  page: z.number().min(1, "Page number must be at least 1"),
  limit: z.number().min(1, "Limit must be at least 1"),
  query: z.string().min(1, "Search query cannot be empty").optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const getAllUser = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  page: z.number().min(1, "Page number must be at least 1"),
  limit: z.number().min(1, "Limit must be at least 1"),
});

export type User = z.infer<typeof userSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type UpdateInitialDataInput = z.infer<typeof updateInitialDataSchemaZ>;
export type UpdateUserInput = z.infer<typeof updateUserSchemaZ>;
export type GetUserInput = z.infer<typeof getUser>;
export type SearchUsersInput = z.infer<typeof searchUUsers>;
