import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.firelly.in'),
  title: {
    template: "%s | FirellySAT",
    default: "FirellySAT — AI-Powered SAT Prep That Calms Your Nerves",
  },
  description:
    "FirellySAT is your free, AI-powered SAT prep companion. Get personalized study plans, practice with 2000+ official questions, and conquer test anxiety — all in one place.",
  keywords: [
    "SAT prep", "SAT practice questions", "SAT study plan", "SAT anxiety",
    "free SAT prep", "College Board questions", "SAT score improvement",
    "AI study plan", "FirellySAT", "calm SAT prep", "SAT question bank",
    "SAT math practice", "SAT reading practice", "SAT writing practice",
  ],
  authors: [{ name: "FirellySAT" }],
  creator: "FirellySAT",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "FirellySAT — AI-Powered SAT Prep",
    description: "Free AI-powered SAT prep with personalized study plans, 2000+ official questions, and calming tools.",
    siteName: "FirellySAT",
  },
  twitter: {
    card: "summary_large_image",
    title: "FirellySAT — AI-Powered SAT Prep",
    description: "Free AI-powered SAT prep with personalized study plans.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0F1B35",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F1F5F9",
              },
            }}
          />
      </body>
    </html>
  );
}
