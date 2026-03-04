"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FilterBar from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";
import { TABLE_FILTERS } from "@/lib/tableFilters";

const TABLE_LABELS: Record<string, string> = {
  companies: "Companies",
  investors: "Investors",
  investment_rounds: "Rounds",
};

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  company_name: "Company",
  founded: "Founded",
  employees: "Employees",
  country: "Country",
  stage: "Stage",
  city: "City",
  type: "Type",
  round_type: "Round type",
  investors: "Investors",
  amount: "Amount",
  valuation: "Valuation",
  date: "Date",
  created: "Created",
};

const PAGE_SIZE = 50;

interface TableViewProps {
  tableName: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    const s = JSON.stringify(value);
    return s.length > 80 ? s.slice(0, 77) + "..." : s;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.length > 80) return value.slice(0, 77) + "...";
  return String(value);
}

export default function TableView({ tableName }: TableViewProps) {
  const [data, setData] = useState<{ rows: Record<string, unknown>[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string | number | string[]>>({});
  const [filterConfig, setFilterConfig] = useState<FilterConfig[] | null>(null);
  const [page, setPage] = useState(1);

  const tableFilterSetup = TABLE_FILTERS[tableName];
  const hasFilters = !!tableFilterSetup;

  const fetchData = useCallback(
    (filters: Record<string, string | number | string[]>, pageNum: number = 1) => {
      setLoading(true);
      setError(null);
      const offset = (pageNum - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      Object.entries(filters).forEach(([k, v]) => {
        if (v === "" || v === undefined || v === null) return;
        if (Array.isArray(v)) {
          if (v.length > 0) params.set(k, v.join(","));
        } else {
          params.set(k, String(v));
        }
      });
      fetch(`/api/tables/${tableName}?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error);
          setData(d);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [tableName]
  );

  useEffect(() => {
    if (hasFilters && tableFilterSetup) {
      const params = new URLSearchParams();
      const country = filterValues.country;
      if (Array.isArray(country) && country.length > 0) {
        params.set("country", country.join(","));
      }
      const url = params.toString() ? `${tableFilterSetup.filtersApi}?${params}` : tableFilterSetup.filtersApi;
      fetch(url)
        .then((r) => r.json())
        .then((opts) => {
          setFilterConfig(tableFilterSetup.filters(opts));
        })
        .catch(() => setFilterConfig([]));
    } else {
      setFilterConfig(null);
    }
  }, [tableName, hasFilters, tableFilterSetup, filterValues.country]);

  useEffect(() => {
    setFilterValues({});
    setPage(1);
    fetchData({}, 1);
  }, [tableName, fetchData]);

  const handleFilterChange = (key: string, value: string | number | string[]) => {
    setFilterValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "country") next.city = [];
      return next;
    });
  };

  const getCellUrl = (col: string, table: string, row: Record<string, unknown>): string | null => {
    if (table === "companies" || table === "investors") {
      return col === "name" && row.stanbase_url ? String(row.stanbase_url) : null;
    }
    if (table === "investment_rounds") {
      if (col === "company_name" && row.company_url) return String(row.company_url);
      if (col === "round_type" && row.round_url) return String(row.round_url);
    }
    return null;
  };

  const handleFilterApply = () => {
    setPage(1);
    fetchData(filterValues, 1);
  };
  const handleFilterReset = () => {
    setFilterValues({});
    setPage(1);
    fetchData({}, 1);
  };
  const goToPage = (p: number) => {
    setPage(p);
    fetchData(filterValues, p);
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const title = TABLE_LABELS[tableName] || tableName.replace(/_/g, " ");

  if (!data?.rows?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">No data</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data.rows[0]).filter(
    (c) => !["stanbase_url", "company_url", "round_url"].includes(c)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-sm text-slate-500">
          {data.total} rows
          {data.total > PAGE_SIZE && ` · ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.total)}`}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasFilters && filterConfig && (
          <FilterBar
            filters={filterConfig}
            values={filterValues}
            onChange={handleFilterChange}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
          />
        )}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left font-medium text-slate-600"
                  >
                    {COLUMN_LABELS[col] || col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  {columns.map((col) => {
                    const val = row[col];
                    const cellUrl = getCellUrl(col, tableName, row);
                    const isInvestorsCol = tableName === "investment_rounds" && col === "investors";
                    const investorsList = isInvestorsCol && Array.isArray(val) ? val as { name: string; url: string | null }[] : null;

                    let content: React.ReactNode;
                    if (cellUrl) {
                      content = (
                        <a href={cellUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-medium">
                          {formatCell(val)}
                        </a>
                      );
                    } else if (investorsList && investorsList.length > 0) {
                      content = (
                        <span className="flex flex-wrap gap-x-0.5">
                          {investorsList.map((inv, j) => (
                            <span key={j}>
                              {j > 0 && ", "}
                              {inv.url ? (
                                <a href={inv.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                                  {inv.name}
                                </a>
                              ) : (
                                inv.name
                              )}
                            </span>
                          ))}
                        </span>
                      );
                    } else {
                      content = <span className="truncate block max-w-[200px]">{formatCell(val)}</span>;
                    }

                    return (
                      <td key={col} className="max-w-xs px-4 py-2 text-slate-700" title={formatCell(val)}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Page {page} of {Math.ceil(data.total / PAGE_SIZE)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
