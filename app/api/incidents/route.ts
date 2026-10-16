import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/auth";
import { diagnose } from "@/lib/diagnostics/diagnose";
import { createIncidentSchema } from "@/lib/validation";
import { createIncident, listIncidents, persistenceMode } from "@/lib/repositories/incidents";
import { takeRateLimit } from "@/lib/rate-limit";
import { coordinateWithAgent } from "@/lib/cloudflare/agent";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json({ incidents: await listIncidents(userId), persistence: persistenceMode() });
  } catch {
    return NextResponse.json({ error: "Incident history is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!takeRateLimit(userId)) {
    return NextResponse.json({ error: "Too many investigations. Try again shortly." }, { status: 429 });
  }
  const parsed = createIncidentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid incident input.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const logs = [parsed.data.logs, parsed.data.attachment?.content].filter(Boolean).join("\n");
    const now = new Date().toISOString();
    const id = randomUUID();
    const diagnostic = await diagnose({ description: parsed.data.description, logs, configuration: parsed.data.configuration });
    const coordination = await coordinateWithAgent({ incidentId: id, description: parsed.data.description, evidence: [logs, parsed.data.configuration].filter(Boolean).join("\n") });
    diagnostic.coordination = coordination
      ? { provider: "cloudflare-agents", status: "completed", sessionId: coordination.sessionId, summary: coordination.summary }
      : { provider: "cloudflare-agents", status: "unavailable", sessionId: id };
    const incident = await createIncident({
      id,
      ownerId: userId,
      title: parsed.data.description.slice(0, 90),
      description: parsed.data.description,
      logs,
      configuration: parsed.data.configuration,
      status: "ready",
      diagnostic,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ incident, persistence: persistenceMode() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Investigation could not be completed. No change was saved." }, { status: 503 });
  }
}
