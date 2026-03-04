export const UZVC_FIELDS_SELECTABLE = [
  { id: "startup_name", label: "Startup project name" },
  { id: "employees_count", label: "Employees count" },
  { id: "project_sector", label: "Project sector" },
  { id: "product_stage", label: "Product stage" },
  { id: "venture_fund", label: "Name of the venture fund that invested" },
  { id: "amount", label: "Investment amount (USD)" },
  { id: "year", label: "Investment month/year" },
] as const;

export const UZVC_LINK_FIELD = { id: "link", label: "Stanbase link" } as const;

export type UzvcFieldId = (typeof UZVC_FIELDS_SELECTABLE)[number]["id"];
