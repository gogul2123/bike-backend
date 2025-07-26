// db/connection.ts
import { MongoClient, Collection } from "mongodb";
import { envConfig } from "../../config/env.ts";

const uri = envConfig.mongoDbUri;
let client: MongoClient | undefined;

async function connect(): Promise<MongoClient> {
  if (!client) {
    if (!uri) throw new Error("MONGO_URI is not defined");
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      waitQueueTimeoutMS: 5000,
      maxIdleTimeMS: 30000,
    });
    await client.connect();
    console.log("Connected to MongoDB");
  }
  return client;
}

export async function getCollection<T extends Document = any>(
  name: string
): Promise<Collection<T>> {
  const client = await connect();
  const dbName = envConfig.mongoDbName;
  return client.db(dbName).collection<T>(name);
}

export async function close(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    console.log("MongoDB connection closed");
  }
}
