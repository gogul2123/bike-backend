// modules/auth/user.service.ts

import { stat } from "fs";
import { User } from "../../types/index.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { getCollection } from "../db/database.ts";
import { UpdateUserInput } from "./user.model.ts";

export async function getOrCreateUser(
  mobile: string,
  role?: "user" | "admin"
): Promise<User> {
  const col = await getCollection("users");
  let user = await col.findOne({ mobile });
  if (!user) {
    const userId = generateNumericEpochId("USR");
    user = {
      mobile,
      email: "",
      name: "",
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role || "user",
      _id: undefined,
      status: "inactive",
    };
    await col.insertOne(user);
  }
  return user;
}

export async function updateUserStatus(
  data: UpdateUserInput
): Promise<boolean> {
  const col = await getCollection("users");
  const result = await col.updateOne(
    { userId: data.userId },
    { $set: { ...data, updatedAt: new Date(), status: "active" } }
  );
  if (result.modifiedCount === 0) {
    throw new Error("User not found or no changes made");
  }
  return result.modifiedCount > 0;
}

export async function getUserByID(userId: string): Promise<User | null> {
  const col = await getCollection("users");
  const user = await col.findOne(
    { userId },
    { projection: { password: 0, _id: 0 } }
  );
  return user;
}
