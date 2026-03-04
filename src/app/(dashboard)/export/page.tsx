"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExportBlock, { downloadCsv } from "@/components/ExportBlock";
import FilterBar from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";

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

  useEffect(() => {
    fetch("/api/dashboard/filters")
      .then((r) => r.json())
      .then((opts) => {
        setFilterConfig([
          { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
          { key: "year", label: "Year", type: "select", options: opts.year || [] },
        ]);
      })
      .catch(() => setFilterConfig([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    const country = filterValues.country;
    if (Array.isArray(country) && country.length > 0) {
      params.set("country", country.join(","));
    }
    const year = filterValues.year;
    if (year) {
      params.set("year", String(year));
    }
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : "";

    Promise.all([
      fetch(`${API_BASE}/metrics${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/funding-by-year${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/companies-by-country${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/rounds-by-stage${suffix}`).then((r) => r.json()),
    ])
      .then(([m, f, c, r]) => {
        setMetrics(m?.error ? null : m);
        setFundingByYear(Array.isArray(f) ? f : []);
        setCompaniesByCountry(Array.isArray(c) ? c : []);
        setRoundsByStage(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  }, [filterValues]);

  const handleFilterApply = () => {
    setLoading(true);
    const params = new URLSearchParams();
    const country = filterValues.country;
    if (Array.isArray(country) && country.length > 0) {
      params.set("country", country.join(","));
    }
    const year = filterValues.year;
    if (year) {
      params.set("year", String(year));
    }
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : "";

    Promise.all([
      fetch(`${API_BASE}/metrics${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/funding-by-year${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/companies-by-country${suffix}`).then((r) => r.json()),
      fetch(`${API_BASE}/rounds-by-stage${suffix}`).then((r) => r.json()),
    ])
      .then(([m, f, c, r]) => {
        setMetrics(m?.error ? null : m);
        setFundingByYear(Array.isArray(f) ? f : []);
        setCompaniesByCountry(Array.isArray(c) ? c : []);
        setRoundsByStage(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  };

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
    fundingByYear.forEach((d) => lines.push(`${d.year},${d.rounds_count},${d.total_amount}`));
    lines.push("");
    lines.push("Companies by country");
    lines.push("Country,Count");
    companiesByCountry.forEach((d) => lines.push(`${d.name},${d.companies_count}`));
    lines.push("");
    lines.push("Rounds by stage");
    lines.push("Stage,Rounds,Amount");
    roundsByStage.forEach((d) => lines.push(`${d.name},${d.rounds_count},${d.total_amount}`));
    downloadCsv(lines.join("\n"), "stanmetrics-overview.csv");
  };

  const buildUzvcReportUrl = () => {
    const params = new URLSearchParams();
    const country = filterValues.country;
    if (Array.isArray(country) && country.length > 0) {
      params.set("country", country.join(","));
    }
    const year = filterValues.year;
    if (year) {
      params.set("year", String(year));
    }
    return `/api/export/uzvc-report?${params.toString()}`;
  };

  const buildTableExportUrl = (table: string) => {
    const params = new URLSearchParams({ format: "csv", limit: "10000" });
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export data as CSV. Apply filters to narrow down the export.
        </p>
      </div>

      {filterConfig.length > 0 && (
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Export presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ExportBlock title="Report for UzVC" defaultExpanded>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Rounds report with: Startup project name, Project sector, Customer type, Product stage,
                Venture fund, Investment amount, Investment year, Stanbase link.
              </p>
              <a
                href={buildUzvcReportUrl()}
                download
                className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Download Report for UzVC
              </a>
            </div>
          </ExportBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ExportBlock title="Overview metrics" defaultExpanded>
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                Export metrics and chart data (funding by year, companies by country, rounds by stage).
              </p>
              <button
                onClick={exportOverview}
                disabled={loading}
                className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Download overview CSV
              </button>
            </div>
          </ExportBlock>

          <ExportBlock title="Companies">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                Export companies table (up to 10,000 rows).
              </p>
              <a
                href={buildTableExportUrl("companies")}
                download
                className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Download companies CSV
              </a>
            </div>
          </ExportBlock>

          <ExportBlock title="Investors">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                Export investors table (up to 10,000 rows).
              </p>
              <a
                href={buildTableExportUrl("investors")}
                download
                className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Download investors CSV
              </a>
            </div>
          </ExportBlock>

          <ExportBlock title="Rounds">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-slate-600">
                Export investment rounds table (up to 10,000 rows).
              </p>
              <a
                href={buildTableExportUrl("investment_rounds")}
                download
                className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Download rounds CSV
              </a>
            </div>
          </ExportBlock>
        </CardContent>
      </Card>
    </div>
  );
}
