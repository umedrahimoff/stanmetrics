"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    const s = JSON.stringify(value);
    return s.length > 60 ? s.slice(0, 57) + "..." : s;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  return str.length > 60 ? str.slice(0, 57) + "..." : str;
}

export default function AllTablesPage() {
  const [data, setData] = useState<Record<string, { rows: Record<string, unknown>[]; total: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/tables/all")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setExpanded(new Set(Object.keys(d).slice(0, 3)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (table: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Все таблицы БД</h1>
        <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">Ошибка: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const tables = data ? Object.entries(data) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Все таблицы БД</h1>
      <p className="text-sm text-slate-500">
        Показано до 100 строк на таблицу. Всего таблиц: {tables.length}
      </p>

      <div className="space-y-3">
        {tables.map(([tableName, { rows, total }]) => {
          const isOpen = expanded.has(tableName);
          const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

          return (
            <Card key={tableName} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer py-4 hover:bg-slate-50"
                onClick={() => toggle(tableName)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="font-mono">{tableName}</span>
                  <span className="text-sm font-normal text-slate-500">
                    {total} записей {rows.length < total && `(показано ${rows.length})`}
                  </span>
                </CardTitle>
              </CardHeader>
              {isOpen && (
                <CardContent className="border-t border-slate-100 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {cols.map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left font-medium text-slate-600"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            {cols.map((col) => (
                              <td key={col} className="px-3 py-2 text-slate-700">
                                {formatCell(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
