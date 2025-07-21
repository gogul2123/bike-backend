import { MongoClient } from "mongodb";
import { envConfig } from "../../config/env";
const uri = envConfig.mongoDbUri;
let client: MongoClient | undefined;

export async function connect() {
  if (client) return client;
  if (!uri) {
    throw new Error("MONGO_URI environment variable is not defined");
  }
  client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    waitQueueTimeoutMS: 5000,
    maxIdleTimeMS: 30000,
  });
  await client.connect();
  console.log("Connected to MongoDB");
  return client;
}

export async function close() {
  if (client) await client.close();
}
