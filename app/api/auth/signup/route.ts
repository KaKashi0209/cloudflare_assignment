import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation";
import { createUser } from "@/lib/repositories/users";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!takeRateLimit(`signup:${ip}`, 8)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const user = await createUser(parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Account storage is unavailable. Is MongoDB running?" }, { status: 503 });
  }
}
