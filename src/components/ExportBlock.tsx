"use client";

import { useState } from "react";

interface ExportBlockProps {
  title?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function ExportBlock({
  title = "Export",
  children,
  defaultExpanded = false,
}: ExportBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div
        className="flex cursor-pointer select-none items-center justify-between px-3 py-2"
        onClick={() => setExpanded((e) => !e)}
      >
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
      </div>
      {expanded && <div className="border-t border-slate-100 px-3 py-2">{children}</div>}
    </div>
  );
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
