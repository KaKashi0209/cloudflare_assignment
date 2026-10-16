import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation";
import { verifyCredentials } from "@/lib/repositories/users";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!takeRateLimit(`login:${ip}`, 10)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  try {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    const response = NextResponse.json({ user });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Account storage is unavailable. Is MongoDB running?" }, { status: 503 });
  }
}
