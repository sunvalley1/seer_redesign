import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type Tone = "neutral" | "long" | "short" | "quiet";

const TONES: Record<Tone, string> = {
  neutral: "border-transparent bg-sunken text-ink-2",
  long: "border-transparent bg-long-bg text-long",
  short: "border-transparent bg-short-bg text-short",
  quiet: "border-transparent bg-transparent text-ink-4",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] leading-4 font-semibold tracking-wider uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Live/idle marker. Teal only ever means "positive direction", which here is a
 * contest still accepting trades.
 */
export function StatusDot({
  tone = "long",
  pulse = false,
  className,
}: {
  tone?: "long" | "short" | "muted";
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "long" && "bg-long",
        tone === "short" && "bg-short",
        tone === "muted" && "bg-ink-4",
        pulse && "animate-pulse",
        className,
      )}
    />
  );
}
