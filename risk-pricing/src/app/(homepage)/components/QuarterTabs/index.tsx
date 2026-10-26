"use client";

import { useState } from "react";

import { cn } from "@/utils";

import { FOCUS_RING } from "@/consts/styles";

interface Quarter {
  id: string;
  label: string;
  disabled?: boolean;
}

// The experiment runs on a quarterly basis. Only the current quarter has a live
// on-chain market; upcoming quarters are shown as disabled "Coming soon" tabs.
const QUARTERS: Quarter[] = [
  { id: "q3-2026", label: "Q3 2026" },
  { id: "q4-2026", label: "Q4 2026", disabled: true },
];

const QuarterTabs: React.FC = () => {
  const [activeQuarter, setActiveQuarter] = useState<string>("q3-2026");

  return (
    <div className="border-b-klerosUIComponentsStroke flex w-full flex-wrap items-center gap-6 border-b">
      {QUARTERS.map(({ id, label, disabled }) => {
        const isActive = id === activeQuarter;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-current={isActive ? "page" : undefined}
            onClick={() => !disabled && setActiveQuarter(id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold transition-colors",
              FOCUS_RING,
              isActive
                ? "border-klerosUIComponentsPrimaryBlue text-klerosUIComponentsPrimaryText"
                : "text-klerosUIComponentsSecondaryText border-transparent",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:text-klerosUIComponentsPrimaryBlue cursor-pointer",
            )}
          >
            {label}
            {disabled ? (
              <span className="bg-klerosUIComponentsMediumBlue text-klerosUIComponentsPrimaryBlue rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-wider uppercase">
                Coming soon
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default QuarterTabs;
