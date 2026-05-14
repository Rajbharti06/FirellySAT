import React from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { Heart, Github, ExternalLink } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Practice Rush", href: "/practice" },
    { label: "AI Study Plan", href: "/study-plan" },
    { label: "Question Bank", href: "/questionbank" },
    { label: "Calm Mode", href: "/calm" },
  ],
  Resources: [
    { label: "SAT Score Guide", href: "/resources/scores" },
    { label: "Study Tips", href: "/resources/tips" },
    { label: "Test Anxiety Help", href: "/resources/anxiety" },
    { label: "FAQs", href: "/faq" },
  ],
  Community: [
    { label: "Changelog", href: "/changelog" },
    { label: "Report a Bug", href: "/report" },
    { label: "Suggest a Feature", href: "/suggest" },
    {
      label: "Source Code",
      href: "https://github.com",
      external: true,
    },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#050B18]">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" className="mb-4" />
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Your calm companion for SAT prep. Learn smarter, stress less, and
              reach your dream score.
            </p>
            <p className="text-xs text-slate-600 mt-4">
              All questions are sourced from the official College Board SAT Suite
              Question Bank.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-500 hover:text-[#F59E0B] transition-colors flex items-center gap-1"
                      >
                        {link.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 hover:text-[#F59E0B] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} FirellySAT. Open source and free forever.
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-[#F59E0B]" /> for students
            everywhere
          </p>
          <p className="text-xs text-slate-600">
            Questions © College Board. Educational use only.
          </p>
        </div>
      </div>
    </footer>
  );
}
