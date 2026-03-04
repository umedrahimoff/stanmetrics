import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "stanmetrics_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "stanmetrics-secret-change-me");
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/", req.url));
      } catch {
        // invalid token, allow login
      }
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "stanmetrics-secret-change-me");
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/", "/login", "/data/:path*", "/export", "/api/((?!auth|webhooks).*)"],
};
