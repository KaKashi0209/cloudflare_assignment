import type { Collection } from "mongodb";
import type { Incident, VerificationState } from "@/lib/domain";
import { getDb } from "@/lib/db/mongo";

type StoredIncident = Incident & { _id?: string };
const local = new Map<string, StoredIncident>();

async function collection(): Promise<Collection<StoredIncident> | null> {
  const db = await getDb();
  if (!db) return null;
  const records = db.collection<StoredIncident>("incidents");
  await records.createIndex({ ownerId: 1, updatedAt: -1 });
  await records.createIndex({ id: 1, ownerId: 1 }, { unique: true });
  return records;
}

export async function createIncident(incident: Incident): Promise<Incident> {
  const records = await collection();
  if (records) await records.insertOne(incident);
  else local.set(incident.id, incident);
  return incident;
}

export async function listIncidents(ownerId: string, page = 1, limit = 20): Promise<Incident[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const records = await collection();
  if (records) return records.find({ ownerId }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).skip((page - 1) * safeLimit).limit(safeLimit).toArray();
  return [...local.values()].filter((item) => item.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice((page - 1) * safeLimit, page * safeLimit);
}

export async function findIncident(ownerId: string, id: string): Promise<Incident | null> {
  const records = await collection();
  if (records) return records.findOne({ ownerId, id }, { projection: { _id: 0 } });
  return local.get(id)?.ownerId === ownerId ? local.get(id) ?? null : null;
}

export async function updateVerification(ownerId: string, id: string, stepId: string, state: VerificationState, result?: string): Promise<Incident | null> {
  const record = await findIncident(ownerId, id);
  if (!record) return null;
  const step = record.diagnostic.verificationPlan.find((candidate) => candidate.id === stepId);
  if (!step) return null;
  step.state = state;
  step.result = result;
  record.updatedAt = new Date().toISOString();
  const records = await collection();
  if (records) await records.updateOne({ ownerId, id }, { $set: { "diagnostic.verificationPlan": record.diagnostic.verificationPlan, updatedAt: record.updatedAt } });
  else local.set(id, record);
  return record;
}

export const persistenceMode = () => (process.env.MONGODB_URI ? "mongodb" : "development-memory");
