// modules/auth/user.service.ts
import { User } from "../../types";
import { generateEpochId } from "../../utils/generator";
import { connect } from "../db/database";

export async function getOrCreateUser(
  mobile: string,
  role?: "user" | "admin"
): Promise<User> {
  const client = await connect();
  const col = client.db().collection<User>("users");

  let user = await col.findOne({ mobile });
  if (!user) {
    const userId = generateEpochId("usr_");
    user = {
      mobile,
      email: "",
      name: "",
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role || "user",
      _id: undefined,
    };
    await col.insertOne(user);
  }
  return user;
}
