import type { Metadata } from "next";
import { StudyPlanGenerator } from "@/components/study-plan/plan-generator";

export const metadata: Metadata = {
  title: "AI Study Plan",
  description:
    "Generate your personalized SAT study plan powered by AI. Tell us your target score and test date.",
};

export default function StudyPlanPage() {
  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        <StudyPlanGenerator />
      </div>
    </div>
  );
}
