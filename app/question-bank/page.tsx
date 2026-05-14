"use client";

import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { questionBank } from "@/lib/mock-data";

export default function QuestionBankPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return questionBank.filter((question) =>
      `${question.id} ${question.section} ${question.topic} ${question.stem}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  return (
    <SiteShell
      title="Searchable SAT Question Bank"
      subtitle="Find SAT-style questions by section, topic, and difficulty."
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by topic, section, or keyword"
        className="w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-700"
      />
      <p className="mt-2 text-xs text-slate-500">
        Educational SAT-style content only. Use official SAT materials in line with College Board terms.
      </p>
      <ul className="mt-4 space-y-2">
        {filtered.map((question) => (
          <li key={question.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              {question.id} · {question.section} · {question.difficulty}
            </p>
            <p className="mt-1 text-sm font-medium">{question.topic}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{question.stem}</p>
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
