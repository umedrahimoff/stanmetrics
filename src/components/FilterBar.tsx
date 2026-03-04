"use client";

import SearchableCheckboxSelect from "./SearchableCheckboxSelect";

export type FilterType = "text" | "select" | "number" | "multiselect";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string | number | string[]>;
  onChange: (key: string, value: string | number | string[]) => void;
  onApply: () => void;
  onReset: () => void;
}

const inputBase = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export default function FilterBar({ filters, values, onChange, onApply, onReset }: FilterBarProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-end gap-4">
        {filters.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">{f.label}</label>
            {f.type === "text" && (
              <input
                type="text"
                value={String(values[f.key] ?? "")}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={`${inputBase} min-w-[140px]`}
              />
            )}
            {f.type === "select" && (
              <select
                value={String(values[f.key] ?? "")}
                onChange={(e) => onChange(f.key, e.target.value)}
                className={`${inputBase} min-w-[120px]`}
              >
                <option value="">All</option>
                {f.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {f.type === "multiselect" && (
              <SearchableCheckboxSelect
                options={f.options || []}
                value={Array.isArray(values[f.key]) ? values[f.key] as string[] : String(values[f.key] ?? "").split(",").filter(Boolean)}
                onChange={(v) => onChange(f.key, v)}
                placeholder="All"
              />
            )}
            {f.type === "number" && (
              <input
                type="number"
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value ? Number(e.target.value) : "")}
                placeholder={f.placeholder}
                className={`${inputBase} w-24`}
              />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="h-9 rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
          >
            Apply
          </button>
          <button
            onClick={onReset}
            className="h-9 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
