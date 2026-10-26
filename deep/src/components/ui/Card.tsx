import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes the body padding — use when the card holds a full-bleed table. */
  flush?: boolean;
}

/** A white surface lifted off the grey page — depth carries the hierarchy. */
export function Card({ children, className, flush = false }: CardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-rule bg-surface shadow-card",
        !flush && "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, eyebrow, description, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-rule px-6 py-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 font-mono text-[10.5px] leading-4 font-semibold tracking-[0.06em] text-ink-3 uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-title font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-body text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
