"use client";

import { useEffect, useState } from "react";

interface SessionUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

const AVATAR_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function getInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "U";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last;
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function Header() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => (window.location.href = "/login"));
  };

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-end border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(displayName)}`}
          >
            {initials}
          </div>
          <span className="hidden text-sm text-slate-700 sm:inline">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
