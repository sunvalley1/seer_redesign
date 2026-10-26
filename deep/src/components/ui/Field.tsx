import { cn } from "@/utils/cn";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Right-hand side of the label row — balance readouts, Max, etc. */
  aside?: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, children, hint, error, aside, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={htmlFor} className="text-body font-medium text-ink">
          {label}
        </label>
        {aside && <div className="flex items-center gap-3 text-body text-ink-3">{aside}</div>}
      </div>
      {children}
      {/* Errors live under the field, never inside the submit button. */}
      {error ? (
        <p className="text-body text-short">{error}</p>
      ) : hint ? (
        <p className="text-body text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export interface AmountInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  label: ReactNode;
  unit?: string;
  hint?: ReactNode;
  error?: string;
  /** Formatted balance string, or undefined while loading. */
  balance?: string;
  balanceLoading?: boolean;
  onMax?: () => void;
  onHalf?: () => void;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { label, unit, hint, error, balance, balanceLoading, onMax, onHalf, className, disabled, ...rest },
  ref,
) {
  const id = useId();
  const showBalance = balance !== undefined || balanceLoading;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px] font-medium text-ink-3">
        <label htmlFor={id}>{label}</label>
        {showBalance && (
          <span className="tabular-nums">
            Balance:{" "}
            {balanceLoading ? (
              <Skeleton className="ml-1 inline-block align-middle" width={60} height={12} />
            ) : (
              <>
                {balance}
                {unit ? ` ${unit}` : ""}
              </>
            )}
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border px-3.5 py-3 transition-[border-color,box-shadow]",
          error
            ? "border-short"
            : "border-rule focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--sb-halo)]",
          disabled && "bg-sunken",
        )}
      >
        <input
          ref={ref}
          id={id}
          type="number"
          step="any"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(
            "min-w-0 flex-1 [appearance:textfield] bg-transparent font-display text-[22px] font-medium tracking-[-0.025em] text-ink tabular-nums outline-none placeholder:text-ink-4 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          {...rest}
        />
        {unit && (
          <span className="inline-flex shrink-0 items-center rounded-full border border-rule bg-surface px-2.5 py-[5px] font-mono text-[11.5px] font-semibold tracking-[0.02em] text-ink-2 uppercase">
            {unit}
          </span>
        )}
      </div>
      {(onHalf || onMax) && (
        <div className="flex justify-end gap-1">
          {onHalf && (
            <button
              type="button"
              onClick={onHalf}
              disabled={disabled || balanceLoading}
              className="cursor-pointer rounded bg-primary-bg px-[7px] py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.06em] text-primary transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              HALF
            </button>
          )}
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled || balanceLoading}
              className="cursor-pointer rounded bg-primary-bg px-[7px] py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.06em] text-primary transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              MAX
            </button>
          )}
        </div>
      )}
      {error ? (
        <p className="text-[12.5px] text-short">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
});

/** Plain text input matching the amount field's shell. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-rule bg-surface px-3.5 py-2.5 text-body text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-5 focus:border-primary focus:shadow-[0_0_0_3px_var(--sb-halo)] disabled:cursor-not-allowed disabled:bg-sunken",
          className,
        )}
        {...rest}
      />
    );
  },
);
