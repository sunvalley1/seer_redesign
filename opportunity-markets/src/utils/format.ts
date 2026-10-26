import { formatUnits } from 'viem';

export function formatBigNumbers(amount: number): string {
  const quantifiers: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];

  for (const [denominator, letter] of quantifiers) {
    if (amount >= denominator) {
      return `${(amount / denominator).toFixed(2)}${letter}`;
    }
  }

  return amount.toFixed(2);
}

export function displayBalance(amount: bigint, decimals = 18): string {
  const value = Number(formatUnits(amount, decimals));
  if (!value) return '0';
  if (value <= 0.001) return '<0.001';
  return formatBigNumbers(value);
}

export function formatSharePrice(price: number): string {
  return `$${(price / 100).toFixed(2)} / share`;
}


/** Odds come from `normalizeOdds` with one decimal; a trailing ".0" is dropped. */
export function formatOddsPercent(odds: number): string {
  return `${Number(odds.toFixed(1))}%`;
}

/** Shown as "20%+" when the pool has no liquidity above `cap` (see useOddsCaps). */
export function formatOddsWithCap(odds: number, cap?: number | null): string {
  return cap == null ? formatOddsPercent(odds) : `${formatOddsPercent(cap)}+`;
}

export const ODDS_CAP_HINT =
  'No liquidity above this price, so the market can’t price it higher. Actual odds may be much higher.';
