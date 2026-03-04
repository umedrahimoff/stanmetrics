"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ExportBlock, { downloadCsv } from "@/components/ExportBlock";
import ExportSkeleton from "@/components/ExportSkeleton";
import FilterBar from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";
import { UZVC_FIELDS_SELECTABLE, UZVC_LINK_FIELD, type UzvcFieldId } from "@/lib/uzvc-fields";
import { cachedFetch, buildQueryString } from "@/lib/fetch-cache";

const API_BASE = "/api";

interface Metrics {
  companies: string;
  investors: string;
  rounds: string;
  total_funding: string;
  news: string;
  events: string;
}

interface FundingByYear {
  year: number;
  rounds_count: string;
  total_amount: string;
}

interface CompaniesByCountry {
  name: string;
  companies_count: string;
}

interface RoundsByStage {
  name: string;
  rounds_count: string;
  total_amount: string;
}

export default function ExportPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [fundingByYear, setFundingByYear] = useState<FundingByYear[]>([]);
  const [companiesByCountry, setCompaniesByCountry] = useState<CompaniesByCountry[]>([]);
  const [roundsByStage, setRoundsByStage] = useState<RoundsByStage[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string | number | string[]>>({});
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [uzvcFields, setUzvcFields] = useState<UzvcFieldId[]>(UZVC_FIELDS_SELECTABLE.map((f) => f.id));

  const loadData = useCallback((filters: Record<string, string | number | string[]>) => {
    setLoading(true);
    const qs = buildQueryString(filters);
    const suffix = qs ? `?${qs}` : "";
    Promise.all([
      cachedFetch(`${API_BASE}/metrics${suffix}`),
      cachedFetch(`${API_BASE}/funding-by-year${suffix}`),
      cachedFetch(`${API_BASE}/companies-by-country${suffix}`),
      cachedFetch(`${API_BASE}/rounds-by-stage${suffix}`),
    ])
      .then(([m, f, c, r]) => {
        setMetrics((m as { error?: string })?.error ? null : (m as Metrics));
        setFundingByYear(Array.isArray(f) ? (f as FundingByYear[]) : []);
        setCompaniesByCountry(Array.isArray(c) ? (c as CompaniesByCountry[]) : []);
        setRoundsByStage(Array.isArray(r) ? (r as RoundsByStage[]) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cachedFetch<{ country?: { value: string; label: string }[]; year?: { value: string; label: string }[] }>("/api/dashboard/filters")
      .then((opts) => {
        setFilterConfig([
          { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
          { key: "year", label: "Year", type: "select", options: opts.year || [] },
        ]);
      })
      .catch(() => setFilterConfig([]));
  }, []);

  useEffect(() => {
    loadData(filterValues);
  }, [filterValues, loadData]);

  const handleFilterApply = () => loadData(filterValues);

  const handleFilterReset = () => {
    setFilterValues({});
  };

  const exportOverview = () => {
    const lines: string[] = [];
    if (metrics) {
      lines.push("Metrics");
      lines.push("Metric,Value");
      lines.push(`Companies,${metrics.companies}`);
      lines.push(`Investors,${metrics.investors}`);
      lines.push(`Rounds,${metrics.rounds}`);
      lines.push(`Total Funding,${metrics.total_funding}`);
      lines.push(`News,${metrics.news}`);
      lines.push(`Events,${metrics.events}`);
      lines.push("");
    }
    lines.push("Funding by year");
    lines.push("Year,Rounds,Amount");
    fundingByYear.slice(0, 10).forEach((d) => lines.push(`${d.year},${d.rounds_count},${d.total_amount}`));
    lines.push("");
    lines.push("Companies by country");
    lines.push("Country,Count");
    companiesByCountry.slice(0, 10).forEach((d) => lines.push(`${d.name},${d.companies_count}`));
    lines.push("");
    lines.push("Rounds by stage");
    lines.push("Stage,Rounds,Amount");
    roundsByStage.slice(0, 10).forEach((d) => lines.push(`${d.name},${d.rounds_count},${d.total_amount}`));
    downloadCsv(lines.join("\n"), "stanmetrics-overview.csv");
  };

  const buildUzvcReportUrl = () => {
    const params = new URLSearchParams();
    if (uzvcFields.length > 0) {
      params.set("fields", uzvcFields.join(","));
    }
    return `/api/export/uzvc-report?${params.toString()}`;
  };

  const toggleUzvcField = (id: UzvcFieldId) => {
    setUzvcFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const buildTableExportUrl = (table: string) => {
    const params = new URLSearchParams({ format: "csv", limit: "10" });
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v === "" || v === undefined || v === null) return;
      if (Array.isArray(v)) {
        if (v.length > 0) params.set(k, v.join(","));
      } else {
        params.set(k, String(v));
      }
    });
    return `/api/tables/${table}?${params}`;
  };

  const exportRow = (title: string, desc: string, action: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-slate-600">{desc}</span>
      {action}
    </div>
  );

  if (loading && !metrics) return <ExportSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Export</h1>
      {filterConfig.length > 0 && (
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-3">
          <CardContent className="space-y-1">
            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Standard
            </h3>
            <ExportBlock title="Overview metrics">
              {exportRow(
                "Overview",
                "Metrics + funding by year, companies by country, rounds by stage",
                <button onClick={exportOverview} disabled={loading} className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50">
                  Download
                </button>
              )}
            </ExportBlock>
            <ExportBlock title="Companies">
              {exportRow("Companies", "Up to 10 rows", <a href={buildTableExportUrl("companies")} download className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Download</a>)}
            </ExportBlock>
            <ExportBlock title="Investors">
              {exportRow("Investors", "Up to 10 rows", <a href={buildTableExportUrl("investors")} download className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Download</a>)}
            </ExportBlock>
            <ExportBlock title="Rounds">
              {exportRow("Rounds", "Up to 10 rows", <a href={buildTableExportUrl("investment_rounds")} download className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Download</a>)}
            </ExportBlock>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="space-y-1">
            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Custom
            </h3>
            <ExportBlock title="Report for UzVC" defaultExpanded>
              <p className="mb-3 text-xs text-slate-500">Uzbekistan only. Select fields to include ({UZVC_LINK_FIELD.label} always at the end):</p>
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
                {UZVC_FIELDS_SELECTABLE.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={uzvcFields.includes(f.id)}
                      onChange={() => toggleUzvcField(f.id)}
                      className="rounded border-slate-300"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <a
                href={buildUzvcReportUrl()}
                download
                className="inline-block rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                Download
              </a>
            </ExportBlock>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
