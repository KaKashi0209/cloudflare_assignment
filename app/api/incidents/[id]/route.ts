import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/auth";
import { findIncident, updateVerification } from "@/lib/repositories/incidents";
import { verificationUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const incident = await findIncident(userId, (await params).id);
  return incident ? NextResponse.json({ incident }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = verificationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification result.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const incident = await updateVerification(userId, (await params).id, parsed.data.stepId, parsed.data.state, parsed.data.result);
  return incident ? NextResponse.json({ incident }) : NextResponse.json({ error: "Incident or verification step was not found." }, { status: 404 });
}
