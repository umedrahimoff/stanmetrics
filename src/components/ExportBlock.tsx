"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="border-slate-200">
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
          <svg
            className={`h-5 w-5 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </CardHeader>
      {expanded && <CardContent className="border-t border-slate-100 pt-4">{children}</CardContent>}
    </Card>
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
