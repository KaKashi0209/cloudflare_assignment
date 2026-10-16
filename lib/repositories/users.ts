import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
}

const SALT_ROUNDS = 12;

async function users(): Promise<Collection<UserRecord> | null> {
  const db = await getDb();
  if (!db) return null;
  const collection = db.collection<UserRecord>("users");
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex({ id: 1 }, { unique: true });
  return collection;
}

/** Creates a user. Returns null when the email already exists. Throws when the store is unavailable. */
export async function createUser(email: string, password: string): Promise<PublicUser | null> {
  const collection = await users();
  if (!collection) throw new Error("Account storage is not configured.");
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await collection.findOne({ email: normalizedEmail });
  if (existing) return null;
  const user: UserRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    createdAt: new Date().toISOString(),
  };
  await collection.insertOne(user);
  return { id: user.id, email: user.email };
}

/** Returns the user when the email/password pair is valid, otherwise null. */
export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  const collection = await users();
  if (!collection) throw new Error("Account storage is not configured.");
  const record = await collection.findOne({ email: email.trim().toLowerCase() });
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  return ok ? { id: record.id, email: record.email } : null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const collection = await users();
  if (!collection) return null;
  const record = await collection.findOne({ id }, { projection: { _id: 0, passwordHash: 0 } });
  return record ? { id: record.id, email: record.email } : null;
}
