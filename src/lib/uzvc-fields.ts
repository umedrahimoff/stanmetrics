export const UZVC_FIELDS_SELECTABLE = [
  { id: "startup_name", label: "Startup project name" },
  { id: "project_sector", label: "Project sector" },
  { id: "product_stage", label: "Product stage" },
  { id: "venture_fund", label: "Name of the venture fund that invested" },
  { id: "amount", label: "Investment amount" },
  { id: "year", label: "Investment year" },
] as const;

export const UZVC_LINK_FIELD = { id: "link", label: "Stanbase link" } as const;

export type UzvcFieldId = (typeof UZVC_FIELDS_SELECTABLE)[number]["id"];
