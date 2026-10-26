import { cn } from "@/utils/cn";
import React, { forwardRef } from "react";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "trade";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /**
   * Why the button can't be used right now. Shown on hover and focus and read
   * by screen readers, and the button stays focusable so the reason is
   * actually reachable. Previously six ORed conditions disabled the execute
   * button and surfaced none of them.
   */
  disabledReason?: string;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "sb-cta border font-semibold",
  secondary: "bg-surface text-ink-2 border border-rule hover:bg-track hover:text-ink",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-track hover:text-ink",
  danger: "bg-surface text-short border border-short-rule hover:bg-short-bg",
  success:
    "bg-long text-white border border-long shadow-raised hover:bg-long-hover hover:border-long-hover",
  trade:
    "!rounded-[8px] border border-transparent bg-[#ea1d21] font-semibold text-white hover:bg-[#d11a1e] hover:shadow-[0_4px_12px_-4px_rgba(234,29,33,0.35)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3 text-data",
  md: "h-10 gap-2 px-5 text-body",
  lg: "h-12 gap-2 px-6 text-lede",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    disabled = false,
    disabledReason,
    fullWidth = false,
    iconLeft,
    iconRight,
    className,
    children,
    onClick,
    type = "button",
    ...rest
  },
  ref,
) {
  const inert = disabled || loading;
  // With a reason to show, stay focusable and block the action instead of
  // going `disabled`, which would make the explanation unreachable.
  const softDisabled = inert && !!disabledReason && !loading;

  const button = (
    <button
      ref={ref}
      type={type}
      disabled={inert && !softDisabled}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (inert) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full font-medium whitespace-nowrap transition",
        "disabled:shadow-none aria-disabled:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );

  if (inert && disabledReason) {
    return <Tooltip content={disabledReason}>{button}</Tooltip>;
  }

  return button;
});
