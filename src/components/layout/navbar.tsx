"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Menu, X, Flame, BookOpen, LayoutDashboard,
  Sparkles, BookMarked, Wind, FileText, Sun, Moon
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: Flame },
  { href: "/mock-test", label: "Mock Test", icon: FileText },
  { href: "/study-plan", label: "Study Plan", icon: Sparkles },
  { href: "/questionbank", label: "Question Bank", icon: BookMarked },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/calm", label: "Calm Mode", icon: Wind },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={cn(
          "mx-auto max-w-7xl mt-3 px-4 transition-all duration-300",
          scrolled
            ? "glass rounded-2xl border border-white/10 shadow-xl mx-4 md:mx-auto"
            : "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between h-14 lg:h-16 px-2">
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "text-[#F59E0B] bg-[#F59E0B]/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs — plain links with button styling */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/questionbank"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:border-[#F59E0B] transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Browse
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all shadow-[0_0_16px_rgba(245,158,11,0.3)]"
            >
              <Flame className="w-4 h-4" />
              Practice
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden"
          >
            <div className="pb-4 pt-2 flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    pathname === href
                      ? "text-[#F59E0B] bg-[#F59E0B]/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/questionbank"
                  className="text-center py-2 rounded-xl text-sm font-semibold border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-all"
                >
                  Browse Questions
                </Link>
                <Link
                  href="/practice"
                  className="text-center py-2 rounded-xl text-sm font-semibold bg-[#F59E0B] text-[#050B18] hover:bg-[#FBBF24] transition-all"
                >
                  Start Practice
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  );
}
