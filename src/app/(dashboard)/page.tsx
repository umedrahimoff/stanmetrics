import { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Stanmetrics — Stanbase Analytics",
  description: "Analytics dashboard for Stanbase startups and investors database",
};

export default function Home() {
  return <Dashboard />;
}
