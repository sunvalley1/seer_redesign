import * as React from 'react';
import { Link } from 'react-router-dom';
import type { Market } from '@seer-pm/sdk';
import { MarketStatus, getMarketStatus } from '@seer-pm/sdk';
import { useOddsCaps } from '../hooks/useOddsCaps';
import {
  ODDS_CAP_HINT,
  formatBigNumbers,
  formatOddsPercent,
  formatOddsWithCap,
} from '../utils/format';
import { getMarketDisplayTitle } from '../config/market';
import DesignCarousel from './DesignCarousel';

export interface MarketPreviewCardProps {
  readonly market: Market;
  readonly cascadeIndex?: number;
}

const PREVIEW_OUTCOME_CAP = 3;

function getBestOddsOutcome(market: Market): {
  label: string | null;
  displayPrice: string | null;
  percent: number | null;
  leadingIndex: number;
  outcomes: Array<{ index: number; label: string; percent: number }>;
  ranked: Array<{ index: number; label: string; percent: number }>;
} {
  const odds = market.odds ?? [];
  const rawOutcomes = market.outcomes ?? [];

  const outcomes = odds.map((value, i) => {
    const percent = Number(value ?? 0);
    const label =
      typeof rawOutcomes[i] === 'string'
        ? (rawOutcomes[i] as string)
        : `Outcome ${i + 1}`;
    return { index: i, label, percent: Number.isFinite(percent) ? percent : 0 };
  });

  let leadingIndex = 0;
  let leadingOdds = Number(odds[0] ?? 0);
  for (let i = 1; i < odds.length; i++) {
    const value = Number(odds[i] ?? 0);
    if (value > leadingOdds) {
      leadingOdds = value;
      leadingIndex = i;
    }
  }

  const leadingPercent = leadingOdds;
  const label = outcomes[leadingIndex]?.label ?? null;
  const displayPrice =
    Number.isFinite(leadingPercent) && leadingPercent > 0
      ? formatOddsPercent(leadingPercent)
      : null;

  const ranked = [...outcomes].sort((a, b) => b.percent - a.percent);

  return {
    label,
    displayPrice,
    percent: Number.isFinite(leadingPercent) ? leadingPercent : null,
    leadingIndex,
    outcomes: outcomes.slice(0, 6),
    ranked,
  };
}

function shareTone(index: number, leadingIndex: number, count: number): string {
  if (index === leadingIndex) return 'bg-up';
  if (count <= 1) return 'bg-paper/35';
  const steps = ['bg-paper/35', 'bg-paper/25', 'bg-paper/18', 'bg-paper/12'];
  const step = index > leadingIndex ? index - 1 : index;
  return steps[Math.min(Math.max(step, 0), steps.length - 1)] ?? 'bg-paper/12';
}

export const MarketPreviewCard: React.FC<MarketPreviewCardProps> = ({
  market,
  cascadeIndex = 0,
}) => {
  const {
    label: leadingLabel,
    displayPrice,
    leadingIndex,
    outcomes,
    ranked,
  } = getBestOddsOutcome(market);
  const { data: oddsCaps } = useOddsCaps(market);
  const leadingCap = oddsCaps?.[leadingIndex];

  const isClosed = getMarketStatus(market) === MarketStatus.CLOSED;
  const marketStatusText = isClosed ? 'Closed' : 'Active';

  const oddsClass =
    'font-display text-[26px] font-medium tracking-[-0.025em] tabular-nums text-paper';

  const total = outcomes.reduce((sum, o) => sum + o.percent, 0);
  const hasOdds = total > 0;
  const topOutcomes = ranked.slice(0, PREVIEW_OUTCOME_CAP);
  const hiddenOutcomes = Math.max(ranked.length - PREVIEW_OUTCOME_CAP, 0);
  const displayTitle = getMarketDisplayTitle(market.id, market.marketName);
  const hasLeader = Boolean(leadingLabel && displayPrice);
  const marketHref = `/markets/${market.chainId}/${market.id}`;

  return (
    <article
      className="lot-panel lot-cascade-item group flex min-w-0 flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-up/40 hover:shadow-lot"
      style={
        {
          '--cascade-i': cascadeIndex,
          viewTransitionName: `lot-${market.chainId}-${market.id}`,
        } as React.CSSProperties
      }
    >
      <Link
        to={marketHref}
        aria-label={`Open opportunity: ${displayTitle}`}
        className="flex flex-col gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-up sm:gap-5 sm:p-6 md:gap-6 md:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
          <span
            className={
              isClosed
                ? 'rounded-control border border-paper/15 px-2.5 py-1 text-muted'
                : 'rounded-control border border-up/35 px-2.5 py-1 text-up'
            }
          >
            {marketStatusText}
          </span>
          <span>
            Liquidity{' '}
            <span className="text-paper">
              {market.liquidityUSD !== undefined
                ? `$${formatBigNumbers(Number(market.liquidityUSD))}`
                : '—'}
            </span>
          </span>
        </div>

        <h2 className="font-display text-xl font-semibold leading-snug tracking-[-0.025em] text-paper transition-colors group-hover:text-up">
          {displayTitle}
        </h2>

        {outcomes.length > 0 && (
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-control bg-wall"
            aria-hidden
          >
            {hasOdds
              ? outcomes.map((outcome, i) => {
                  const width = Math.max((outcome.percent / total) * 100, 0);
                  return (
                    <div
                      key={`${outcome.label}-${i}`}
                      className={shareTone(i, leadingIndex, outcomes.length)}
                      style={{ width: `${width}%` }}
                    />
                  );
                })
              : null}
          </div>
        )}

        {topOutcomes.length > 0 && (
          <ul className="flex flex-col gap-2">
            {topOutcomes.map((outcome) => (
              <li
                key={outcome.label}
                className="flex min-w-0 items-baseline justify-between gap-3"
              >
                <span className="min-w-0 truncate text-[12.5px] font-medium text-paper">
                  {outcome.label}
                </span>
                <span
                  title={oddsCaps?.[outcome.index] != null ? ODDS_CAP_HINT : undefined}
                  className={
                    outcome.label === leadingLabel && displayPrice != null
                      ? 'shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-up'
                      : 'shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-muted'
                  }
                >
                  {formatOddsWithCap(outcome.percent, oddsCaps?.[outcome.index])}
                </span>
              </li>
            ))}
            {hiddenOutcomes > 0 && (
              <li className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
                +{hiddenOutcomes} more
              </li>
            )}
          </ul>
        )}
      </Link>

      <DesignCarousel
        market={market}
        variant="home"
        embedded
        className="border-t border-edge px-5 py-4 sm:px-6 sm:py-5 md:px-8"
      />

      <Link
        to={marketHref}
        className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-edge px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-up sm:px-6 sm:py-5 md:px-8"
      >
        <div className="flex flex-col items-start gap-2">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
            {hasLeader ? `Leading · ${leadingLabel}` : 'Leading odds'}
          </span>
          <div className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={oddsClass}
              title={displayPrice != null && leadingCap != null ? ODDS_CAP_HINT : undefined}
            >
              {displayPrice != null && leadingCap != null
                ? formatOddsWithCap(0, leadingCap)
                : (displayPrice ?? '—')}
            </span>
          </div>
        </div>
        <span className="text-[13px] font-semibold text-brand transition-colors group-hover:text-paper">
          Open opportunity →
        </span>
      </Link>
    </article>
  );
};

export default MarketPreviewCard;
