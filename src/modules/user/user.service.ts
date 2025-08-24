// modules/auth/user.service.ts

import bcrypt from "bcrypt"; // Import bcrypt for password hashing
import {
  User,
  SignUpInput,
  UpdateUserInput,
  UpdateInitialDataInput,
} from "./user.model.ts";
import { getCollection } from "../db/database.ts";
import { generateNumericEpochId } from "../../utils/generator.ts";
import { sendError } from "../../utils/response.ts";
import { stat } from "fs";

const SALT_ROUNDS = 10;

// export async function getOrCreateUser(
//   data: SignUpInput,
//   role: "user" | "admin" = "user"
// ): Promise<User | null> {
//   const col = await getCollection("users");

//   // Check if user exists
//   let user = await col.findOne({
//     $or: [{ email: data.email }, { mobile: data.mobile }],
//   });

//   if (!user) {
//     // Hash password before storing
//     const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
//     data.password = hashedPassword;
//     const newUser = {
//       userId: generateNumericEpochId("USR"),
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       role: role,
//       status: "inactive" as const,
//       ...data,
//     };

//     await col.insertOne(newUser);

//     return newUser;
//   }

//   return user;
// }

export async function getOrCreateUser(
  email: string,
  role: "user" | "admin" = "user"
): Promise<any | null> {
  const col = await getCollection("users");

  // Check if user exists
  let user = await col.findOne(
    { email },
    {
      projection: {
        _id: 0,
        address: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    }
  );

  if (!user) {
    const newUser = {
      userId: generateNumericEpochId("USR"),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role,
      status: "inactive" as const,
      email,
      name: "",
      mobile: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
    };

    await col.insertOne(newUser);

    return {
      name: newUser.name,
      email: newUser.email,
      userId: newUser.userId,
      role: newUser.role,
      status: newUser.status,
      mobile: newUser.mobile,
    };
  }
  return user;
}

export async function updateUserInitialData(
  data: UpdateInitialDataInput
): Promise<any | null> {
  const col = await getCollection("users");
  const result = await col.updateOne(
    { userId: data.userId },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
        status: "active",
      },
    }
  );
  return result;
}

export async function updateUser(data: UpdateUserInput): Promise<any | null> {
  const col = await getCollection("users");
  const result = await col.updateOne(
    { userId: data.userId },
    { $set: { ...data, updatedAt: new Date(), status: "active" } }
  );
  if (result.modifiedCount === 0) {
    throw new Error("User not found or no changes made");
  }
  return result;
}

export async function getUserByID(
  userId: string,
  projection?: Record<string, any>
): Promise<User | null> {
  const col = await getCollection("users");
  const user = await col.findOne(
    { userId },
    { projection: { password: 0, _id: 0, ...projection } }
  );
  return user;
}
