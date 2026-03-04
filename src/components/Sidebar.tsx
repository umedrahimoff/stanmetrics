"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABLES = [
  { slug: "companies", label: "Companies" },
  { slug: "investors", label: "Investors" },
  { slug: "investment_rounds", label: "Rounds" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-slate-200 p-4">
          <Link href="/" className="text-lg font-semibold text-slate-900 hover:text-slate-700">
            Stanmetrics
          </Link>
          <a
            href="https://stanbase.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-slate-500 hover:text-slate-700"
          >
            stanbase.tech →
          </a>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            Dashboard
          </p>
          <Link
            href="/"
            className={`mb-1 block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Overview
          </Link>
          <p className="mb-2 mt-4 px-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            Tables
          </p>
          <ul className="space-y-0.5">
            {TABLES.map(({ slug, label }) => (
              <li key={slug}>
                <Link
                  href={`/data/${slug}`}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === `/data/${slug}`
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
