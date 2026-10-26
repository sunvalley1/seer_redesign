import { useId } from "react";

import { BigNumberField } from "@kleros/ui-components-library";
import clsx from "clsx";
import { formatUnits, parseUnits } from "viem";

import { formatValue, isUndefined } from "@/utils";

const QUICK_UNITS = [1, 5, 10] as const;
const QUICK_PERCENTS = [1, 5, 10] as const;
const QUICK_SHARES = [25, 50, 100] as const;

interface ITradeAmountField {
  label: string;
  token: React.ReactNode;
  onChange: (amount: bigint) => void;
  value?: bigint;
  balance?: bigint;
  balanceNote?: React.ReactNode;
  unit?: string;
  name?: string;
  isReadOnly?: boolean;
  error?: string;
  hint?: React.ReactNode;
  quick?: "trade" | "share";
  decimals?: number;
  className?: string;
}

const TradeAmountField: React.FC<ITradeAmountField> = ({
  label,
  token,
  onChange,
  value,
  balance,
  balanceNote,
  unit,
  name,
  isReadOnly,
  error,
  hint,
  quick = "trade",
  decimals = 18,
  className,
}) => {
  const id = useId();
  const current = value ?? 0n;
  const available = balance ?? 0n;
  const canUseBalance = !isReadOnly && available > 0n;

  const addClamped = (delta: bigint) => {
    const next = current + delta;
    onChange(!isUndefined(balance) && next > balance ? balance : next);
  };

  return (
    <div className={clsx("w-full", className)}>
      <div className="io-label">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums">
          Balance: {isUndefined(balance) ? "…" : formatValue(balance, decimals)}
          {unit ? ` ${unit}` : null}
          {balanceNote}
        </span>
      </div>

      <div className={clsx("io-row", error && "is-error")}>
        <BigNumberField
          id={id}
          name={name}
          className="io-field"
          placeholder="0"
          minValue="0"
          isReadOnly={isReadOnly}
          value={isUndefined(value) ? undefined : formatUnits(value, decimals)}
          onChange={(next) => {
            try {
              onChange(parseUnits(next.toFixed(), decimals));
            } catch {
              onChange(0n);
            }
          }}
        />
        {token}
      </div>

      <div className="io-balance">
        <span className={clsx(error && "is-error")}>{error ?? hint}</span>
        <div className="quick-group">
          {quick === "share" ? (
            QUICK_SHARES.map((pct) => (
              <button
                key={pct}
                type="button"
                className="quick-btn quick-btn--pct"
                disabled={!canUseBalance}
                onClick={() => onChange((available * BigInt(pct)) / 100n)}
              >
                {pct}%
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                className="quick-btn quick-btn--full"
                disabled={!canUseBalance}
                onClick={() => onChange(available / 2n)}
              >
                HALF
              </button>
              <button
                type="button"
                className="quick-btn quick-btn--full"
                disabled={!canUseBalance}
                onClick={() => onChange(available)}
              >
                MAX
              </button>
            </>
          )}
        </div>
      </div>

      {quick === "trade" ? (
        <div className="io-quick-actions">
          <div className="quick-group">
            {QUICK_UNITS.map((units) => (
              <button
                key={units}
                type="button"
                className="quick-btn quick-btn--dollar"
                disabled={!canUseBalance}
                onClick={() => addClamped(parseUnits(String(units), decimals))}
              >
                +{units}
              </button>
            ))}
          </div>
          <div className="quick-group">
            {QUICK_PERCENTS.map((pct) => (
              <button
                key={pct}
                type="button"
                className="quick-btn quick-btn--pct"
                disabled={!canUseBalance}
                onClick={() => addClamped((available * BigInt(pct)) / 100n)}
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface ITradeCta {
  text: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  type?: "button" | "submit";
  variant?: "cta" | "ghost";
  className?: string;
  onClick?: () => void;
}

export const TradeCta: React.FC<ITradeCta> = ({
  text,
  isLoading,
  isDisabled,
  type = "button",
  variant = "cta",
  className,
  onClick,
}) => (
  <button
    type={type}
    disabled={isDisabled || isLoading}
    onClick={onClick}
    className={clsx(variant === "cta" ? "trade-cta" : "trade-ghost", className)}
  >
    {isLoading ? <span className="trade-cta-spinner" aria-hidden /> : null}
    {text}
  </button>
);

export default TradeAmountField;
