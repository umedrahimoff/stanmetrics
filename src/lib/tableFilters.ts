import type { FilterConfig } from "@/components/FilterBar";

export interface TableFilterSetup {
  filtersApi: string;
  filters: (options: Record<string, { value: string; label: string }[]>) => FilterConfig[];
}

export const TABLE_FILTERS: Record<string, TableFilterSetup> = {
  companies: {
    filtersApi: "/api/tables/companies/filters",
    filters: (opts) => [
      { key: "search", label: "Search", type: "text", placeholder: "Name or description..." },
      { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
      { key: "stage", label: "Stage", type: "select", options: opts.stage || [] },
      { key: "city", label: "City", type: "multiselect", options: opts.city || [] },
      { key: "founded", label: "Founded", type: "select", options: opts.founded || [] },
    ],
  },
  investors: {
    filtersApi: "/api/tables/investors/filters",
    filters: (opts) => [
      { key: "search", label: "Search", type: "text", placeholder: "Name or description..." },
      { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
      { key: "city", label: "City", type: "multiselect", options: opts.city || [] },
      { key: "type", label: "Type", type: "multiselect", options: opts.type || [] },
      { key: "founded", label: "Founded", type: "select", options: opts.founded || [] },
    ],
  },
  investment_rounds: {
    filtersApi: "/api/tables/investment_rounds/filters",
    filters: (opts) => [
      { key: "search", label: "Search", type: "text", placeholder: "Company name..." },
      { key: "country", label: "Country", type: "multiselect", options: opts.country || [] },
      { key: "stage", label: "Stage", type: "multiselect", options: opts.stage || [] },
      { key: "round_type", label: "Round type", type: "multiselect", options: opts.round_type || [] },
      { key: "year", label: "Year", type: "select", options: opts.year || [] },
    ],
  },
};
