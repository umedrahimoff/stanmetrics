"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar from "@/components/FilterBar";
import type { FilterConfig } from "@/components/FilterBar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShineBorder } from "@/components/ui/shine-border";

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
  id: number;
  name: string;
  companies_count: string;
}

interface RoundsByStage {
  id: number;
  name: string;
  rounds_count: string;
  total_amount: string;
}

interface TopCompany {
  name: string;
  website: string | null;
  total_funding: string;
  rounds_count: string;
}

interface RecentRound {
  company_name: string;
  amount: number | null;
  date: string | null;
  stage: string | null;
  round_type: string | null;
}

const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
];

function formatFunding(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [fundingByYear, setFundingByYear] = useState<FundingByYear[]>([]);
  const [companiesByCountry, setCompaniesByCountry] = useState<CompaniesByCountry[]>([]);
  const [roundsByStage, setRoundsByStage] = useState<RoundsByStage[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string | number | string[]>>({});
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);

  const fetchAll = useCallback(async (filters: Record<string, string | number | string[]>) => {
    const params = new URLSearchParams();
    const country = filters.country;
    if (Array.isArray(country) && country.length > 0) {
      params.set("country", country.join(","));
    }
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : "";

    const [m, f, c, r, t, rec] = await Promise.all([
      fetch(`${API_BASE}/metrics${suffix}`).then((res) => res.json()),
      fetch(`${API_BASE}/funding-by-year${suffix}`).then((res) => res.json()),
      fetch(`${API_BASE}/companies-by-country${suffix}`).then((res) => res.json()),
      fetch(`${API_BASE}/rounds-by-stage${suffix}`).then((res) => res.json()),
      fetch(`${API_BASE}/top-companies${suffix}`).then((res) => res.json()),
      fetch(`${API_BASE}/recent-rounds${suffix}`).then((res) => res.json()),
    ]);
    return { m, f, c, r, t, rec };
  }, []);

  const loadData = useCallback(
    (filters: Record<string, string | number | string[]>, includeFilters = false) => {
      setLoading(true);
      setError(null);
      const dataPromise = fetchAll(filters);
      const promises = includeFilters
        ? Promise.all([dataPromise, fetch("/api/dashboard/filters").then((r) => r.json())])
        : dataPromise.then((d) => [d, null]);

      promises
        .then((res) => {
          const [result, opts] = res as [Awaited<ReturnType<typeof fetchAll>>, { country?: { value: string; label: string }[] } | null];
          const { m, f, c, r, t, rec } = result;
          const apiError = [m, f, c, r, t, rec].find((x) => x?.error) as { error?: string } | undefined;
          if (apiError?.error) setError(apiError.error);
          setMetrics(m?.error ? null : m);
          setFundingByYear(Array.isArray(f) ? f : []);
          setCompaniesByCountry(Array.isArray(c) ? c : []);
          setRoundsByStage(Array.isArray(r) ? r : []);
          setTopCompanies(Array.isArray(t) ? t : []);
          setRecentRounds(Array.isArray(rec) ? rec : []);
          if (opts) {
            setFilterConfig([
              { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
            ]);
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load data"))
        .finally(() => setLoading(false));
    },
    [fetchAll]
  );

  useEffect(() => {
    loadData({}, true);
  }, [loadData]);

  const handleFilterApply = () => loadData(filterValues);
  const handleFilterReset = () => {
    setFilterValues({});
    loadData({});
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">Loading error: {error}. Check DB connection.</p>
        </CardContent>
      </Card>
    );
  }

  const fundingChartData = (Array.isArray(fundingByYear) ? fundingByYear : []).map((d) => ({
    year: String(d.year),
    funding: parseFloat(d.total_amount),
    rounds: parseInt(d.rounds_count, 10),
  }));

  const stageChartData = (Array.isArray(roundsByStage) ? roundsByStage : []).map((d) => ({
    name: d.name || "Unknown",
    value: parseInt(d.rounds_count, 10),
    amount: parseFloat(d.total_amount),
  }));

  const countryChartData = (Array.isArray(companiesByCountry) ? companiesByCountry : []).map((d) => ({
    name: d.name || "Unknown",
    count: parseInt(d.companies_count, 10),
  }));

  const tooltipStyle = {
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  };

  return (
    <div className="space-y-8">
      {filterConfig.length > 0 && (
        <FilterBar
          filters={filterConfig}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        />
      )}
      {/* Metric cards with Shine Border */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics && (
          <>
            <MetricCard label="Companies" value={metrics.companies} color="#0ea5e9" />
            <MetricCard label="Investors" value={metrics.investors} color="#8b5cf6" />
            <MetricCard label="Rounds" value={metrics.rounds} color="#f59e0b" />
            <MetricCard
              label="Total funding"
              value={formatFunding(parseFloat(metrics.total_funding))}
              color="#10b981"
            />
            <MetricCard label="News" value={metrics.news} color="#ec4899" />
            <MetricCard label="Events" value={metrics.events} color="#6366f1" />
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Funding by year">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fundingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatFunding(v)} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number | undefined) => [value != null ? formatFunding(value) : "—", "Funding"]}
              />
              <Bar dataKey="funding" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Companies by country">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countryChartData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Rounds by stage">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stageChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {stageChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name, props) => [
                  `${value ?? 0} rounds, ${formatFunding((props?.payload as { amount?: number })?.amount ?? 0)}`,
                  name ?? "",
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 companies by funding">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">Funding</th>
                  <th className="pb-3 font-medium">Rounds</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(topCompanies) ? topCompanies : []).map((c, i) => (
                  <tr key={i} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          {c.name}
                        </a>
                      ) : (
                        <span className="text-slate-900">{c.name}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      {formatFunding(parseFloat(c.total_funding))}
                    </td>
                    <td className="py-3 text-slate-600">{c.rounds_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Recent rounds table */}
      <ChartCard title="Recent rounds">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 pr-4 font-medium">Company</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Stage</th>
                <th className="pb-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(recentRounds) ? recentRounds : []).map((r, i) => (
                <tr key={i} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                  <td className="py-3 pr-4 text-slate-900">{r.company_name}</td>
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {r.amount != null ? formatFunding(r.amount) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(r.date)}</td>
                  <td className="py-3 pr-4 text-slate-600">{r.stage || "—"}</td>
                  <td className="py-3 text-slate-600">{r.round_type || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <ShineBorder shineColor={color} borderWidth={2} duration={10} className="opacity-70" />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
