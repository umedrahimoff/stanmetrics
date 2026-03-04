import { NextResponse } from "next/server";
import { getCookieConfig } from "@/lib/auth";

export async function POST() {
  const { name, options } = getCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, "", { ...options, maxAge: 0 });
  return res;
}
