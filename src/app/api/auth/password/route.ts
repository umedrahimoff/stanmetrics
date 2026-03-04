import { NextResponse } from "next/server";
import { createSession, getCookieConfig } from "@/lib/auth";

export async function POST(req: Request) {
  const password = process.env.AUTH_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }
  const body = await req.json();
  const input = body?.password ?? "";
  if (input !== password) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const user = { id: 1, firstName: "User", lastName: "", username: "" };
  const jwt = await createSession(user);
  const { name, options } = getCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, jwt, options);
  return res;
}
