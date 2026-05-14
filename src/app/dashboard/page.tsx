export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your SAT practice progress, score predictions, and study plan.",
};

export default function DashboardPage() {
  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <DashboardOverview />
      </div>
    </div>
  );
}
