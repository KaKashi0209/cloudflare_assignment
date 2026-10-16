import { MongoClient, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

/** Returns the shared database handle, or null when MongoDB is not configured. */
export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  clientPromise ??= new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 }).connect();
  return (await clientPromise).db(process.env.MONGODB_DATABASE || "flarefix");
}

export const mongoConfigured = () => Boolean(process.env.MONGODB_URI);
