import { Metadata } from "next";
import TableView from "@/components/TableView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ table: string }>;
}): Promise<Metadata> {
  const { table } = await params;
  const labels: Record<string, string> = {
    companies: "Companies",
    investors: "Investors",
    investment_rounds: "Rounds",
  };
  return {
    title: `${labels[table] || table.replace(/_/g, " ")} — Stanmetrics`,
  };
}

export default async function DataPage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  return <TableView tableName={table} />;
}
