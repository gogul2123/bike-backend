import { getCollection } from "../db/database.ts";
import { Bike } from "./bike.model.ts";

export async function createBikeService(input: Bike): Promise<Bike> {
  const col = await getCollection("bikes");
  const data: any = {
    ...input,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await col.insertOne(data);
  if (!result.acknowledged || !result.insertedId) {
    throw new Error("Insert failed");
  }

  return { _id: result.insertedId.toString(), ...data } as Bike;
}

export async function getBikeById(id: string): Promise<Bike | null> {
  const col = await getCollection("bikes");
  return (await col.findOne({
    _id: id,
    createdAt: 0,
    UpdatedAt: 0,
  })) as Bike | null;
}
