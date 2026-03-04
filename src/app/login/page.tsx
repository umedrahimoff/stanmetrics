"use client";

import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const err = searchParams.get("error");
    if (err === "invalid") setError("Invalid or expired login. Try again.");
    else if (err === "config") setError("Server not configured. Contact admin.");
    else if (err === "auth") setError("Authentication failed. Try again.");
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/bot-info")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !containerRef.current || !data.username) return;
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", data.username);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-auth-url", `${window.location.origin}/api/auth/telegram`);
        script.setAttribute("data-request-access", "write");
        script.async = true;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(script);
      });
    return () => {
      mounted = false;
    };
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
        <div ref={containerRef} className="flex justify-center" />
        <p className="text-center text-xs text-slate-400">
          Link your domain in @BotFather with /setdomain
        </p>
      </div>
    </div>
  );
}
