"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "invalid") setError("Invalid or expired link. Try again.");
    else if (err === "expired") setError("Link expired. Please start over.");
    else if (err === "config") setError("Server not configured. Contact admin.");
    else if (err === "auth") setError("Authentication failed. Try again.");
    else if (err === "start") setError("Could not start login. Try again.");
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Stanmetrics</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with Telegram to access the dashboard
          </p>
        </div>
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="flex flex-col gap-3">
          <a
            href="/api/auth/start"
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0088cc] px-4 py-3 text-white hover:bg-[#0077b5]"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.53 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            Login with Telegram
          </a>
          <p className="text-center text-xs text-slate-400">
            You will be redirected to the bot, then back here
          </p>
        </div>
        <p className="text-center text-xs text-slate-400">
          <Link href="https://t.me/stanmetricsbot" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
            @stanmetricsbot
          </Link>
        </p>
      </div>
    </div>
  );
}
