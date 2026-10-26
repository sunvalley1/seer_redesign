"use client";
import React from "react";

import Link from "next/link";

import SeerLogo from "@/components/SeerLogo";

import { cn } from "@/utils";

const Logo: React.FC = () => (
  <Link
    href="/"
    aria-label="Seer Risk Pricing home"
    className="group flex min-w-0 items-center gap-3"
  >
    <SeerLogo className="group-hover:text-sb-blue h-5 transition-colors" />
    <span aria-hidden className="bg-sb-border-strong h-4 w-px shrink-0" />
    <span
      className={cn(
        "text-sb-ink-2 group-hover:text-sb-ink truncate transition-colors",
        "text-sm font-medium",
      )}
    >
      Risk Pricing
    </span>
  </Link>
);

export default Logo;
