import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice-rush", label: "Practice Rush" },
  { href: "/study-plan", label: "AI Study Plan" },
  { href: "/calm-mode", label: "Calm Mode" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/auth", label: "Auth" },
];

export function SiteShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-emerald-600">
              FirellySAT
            </Link>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
