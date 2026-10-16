import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const cookieName = "flarefix_session";
const maxAge = 60 * 60 * 24 * 30; // 30 days

const secret = () =>
  process.env.FLAREFIX_SESSION_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "development-only-secret-change-me");

const signature = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

/** Returns the authenticated user id from a signed cookie, or null. */
export function userIdFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(cookieName)?.value;
  if (!raw || !secret()) return null;
  const separator = raw.lastIndexOf(".");
  if (separator < 1) return null;
  const id = raw.slice(0, separator);
  const received = raw.slice(separator + 1);
  const expected = signature(id);
  if (received.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected)) ? id : null;
}

/** Writes a signed, HttpOnly session cookie for the given user id onto the response. */
export function setSessionCookie(response: NextResponse, userId: string): void {
  response.cookies.set(cookieName, `${userId}.${signature(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

/** Clears the session cookie (logout). */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export const sessionCookieName = cookieName;
