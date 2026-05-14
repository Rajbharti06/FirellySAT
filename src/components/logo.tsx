import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const iconSize = { sm: 24, md: 32, lg: 48 }[size];
  const textSize = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <FireflyIcon size={iconSize} />
      {showText && (
        <span className={cn("font-bold tracking-tight", textSize)}>
          <span className="gradient-text">Firelly</span>
          <span className="text-white">SAT</span>
        </span>
      )}
    </div>
  );
}

function FireflyIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-firefly"
    >
      {/* Glow circle */}
      <circle cx="16" cy="16" r="14" fill="rgba(245, 158, 11, 0.1)" />

      {/* Firefly body */}
      <ellipse cx="16" cy="17" rx="4" ry="6" fill="#F59E0B" />

      {/* Wings */}
      <ellipse
        cx="11"
        cy="14"
        rx="5"
        ry="3"
        fill="#FCD34D"
        fillOpacity="0.6"
        transform="rotate(-20 11 14)"
      />
      <ellipse
        cx="21"
        cy="14"
        rx="5"
        ry="3"
        fill="#FCD34D"
        fillOpacity="0.6"
        transform="rotate(20 21 14)"
      />

      {/* Glow dot (tail light) */}
      <circle cx="16" cy="22" r="2.5" fill="#FDE68A" />
      <circle cx="16" cy="22" r="4" fill="#F59E0B" fillOpacity="0.3" />

      {/* Antennae */}
      <line x1="14" y1="11" x2="12" y2="7" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="11" x2="20" y2="7" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1.5" fill="#FCD34D" />
      <circle cx="20" cy="7" r="1.5" fill="#FCD34D" />
    </svg>
  );
}

export default Logo;
