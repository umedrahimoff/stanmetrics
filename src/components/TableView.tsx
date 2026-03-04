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
  founded: "Founded",
  employees: "Employees",
  country: "Country",
  stage: "Stage",
  city: "City",
  type: "Type",
  created: "Created",
};

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

  const tableFilterSetup = TABLE_FILTERS[tableName];
  const hasFilters = !!tableFilterSetup;

  const fetchData = useCallback(
    (filters: Record<string, string | number | string[]>) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: "100" });
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
    fetchData({});
  }, [tableName, fetchData]);

  const handleFilterChange = (key: string, value: string | number | string[]) => {
    setFilterValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "country") next.city = [];
      return next;
    });
  };

  const isLinkableName = (table: string, row: Record<string, unknown>) =>
    (table === "companies" || table === "investors") && row.stanbase_url;

  const handleFilterApply = () => fetchData(filterValues);
  const handleFilterReset = () => {
    setFilterValues({});
    fetchData({});
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

  const columns = Object.keys(data.rows[0]).filter((c) => c !== "stanbase_url");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-sm text-slate-500">{data.total} rows</span>
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
                    const formatted = formatCell(val);
                    const isLinkable = col === "name" && isLinkableName(tableName, row);
                    return (
                      <td
                        key={col}
                        className="max-w-xs px-4 py-2 text-slate-700"
                        title={formatted}
                      >
                        {isLinkable ? (
                          <a href={String(row.stanbase_url)} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-medium">
                            {formatted}
                          </a>
                        ) : (
                          <span className="truncate block max-w-[200px]">{formatted}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
