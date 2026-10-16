import { NextRequest, NextResponse } from "next/server";
import { userIdFromRequest } from "@/lib/auth";
import { findUserById } from "@/lib/repositories/users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ user: null });
  try {
    const user = await findUserById(userId);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
