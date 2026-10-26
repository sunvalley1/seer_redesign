import { SEER_LINK_URL } from '../config/seerLink';
import * as React from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { useTokensInfo } from '@seer-pm/react';
import {
  MarketStatus,
  MarketTypes,
  getMarketStatus,
  getMarketType,
  getMultiScalarEstimate,
  getRedeemedPrice,
  getTokenExplorerUrl,
  isInvalidOutcome,
  isOdd,
  type Market,
} from '@seer-pm/sdk';
import { useOutcomeBalances } from '../hooks/useOutcomeBalances';
import { useOddsCaps } from '../hooks/useOddsCaps';
import { useOutcomeTrends } from '../hooks/chart/useChartData';
import { getChainedRedeemValue, type ChainedMarketData } from '../lib/chainedMarket';
import { networks } from '../config/wagmi';
import { ODDS_CAP_HINT, displayBalance, formatOddsWithCap } from '../utils/format';
import MarketChart from './MarketChart/MarketChart';
import MarketDiscussion from './MarketDiscussion';
import SubmissionLightbox from './SubmissionLightbox';
import { AddLiquidityModal } from './outcomes/AddLiquidityModal';
import { OutcomePoolPanel } from './outcomes/OutcomePoolPanel';
import {
  ArrowUpRightIcon,
  BranchIcon,
  CheckCircleIcon,
  DocumentIcon,
  DropletIcon,
  GlobeIcon,
  ImageIcon,
  InvalidOutcomeIcon,
  LayersIcon,
  QuestionIcon,
} from './outcomes/icons';
import {
  getOutcomeSubmissionAssets,
  type SubmissionAssets,
} from '../config/submissions';

type TradeMode = 'buy' | 'sell';

export interface MarketOutcomesProps {
  readonly className?: string;
  readonly market: Market;
  readonly chained?: ChainedMarketData;
  readonly selectedOutcomeIndex: number;
  readonly onSelectOutcome: (index: number) => void;
  readonly onQuickTrade?: (index: number, mode: TradeMode) => void;
}

/** Past this many outcomes the list gets a search box and is collapsed. */
const COLLAPSE_THRESHOLD = 20;
const COLLAPSED_COUNT = 15;

const SEER_APP_URL = SEER_LINK_URL;
const HEADER_OFFSET = 88;
const PANEL_ANIMATION_MS = 300;

const NA_HINT =
  "The odds cannot be displayed because the outcome's current price is far above 1. This typically happens when there is insufficient liquidity in the market.";
const INVALID_HINT =
  'Invalid outcome tokens can be redeemed for the underlying tokens when the question is resolved to invalid.';

interface OutcomeRow {
  readonly index: number;
  readonly rank: number;
  readonly label: string;
  readonly odds: number;
  readonly token: Address;
  readonly image?: string;
  readonly assets?: SubmissionAssets;
  readonly isInvalid: boolean;
  readonly isWinner: boolean;
  readonly branchMarketId: Address;
  readonly branchOutcome: string;
}

function isWinningOutcome(
  market: Market,
  chained: ChainedMarketData | undefined,
  index: number
): boolean {
  const row = chained?.rows[index];
  if (chained && row) {
    return getChainedRedeemValue(chained.levels, row.level, row.outcomeIndex) > 0;
  }
  return market.payoutReported && getRedeemedPrice(market, index) > 0;
}

function compareOdds(a: number, b: number): number {
  const aOk = Number.isFinite(a);
  const bOk = Number.isFinite(b);
  if (!aOk && !bOk) return 0;
  if (!aOk) return 1;
  if (!bOk) return -1;
  return b - a;
}

function compareOutcomes(
  a: { isWinner: boolean; odds: number },
  b: { isWinner: boolean; odds: number }
): number {
  if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
  return compareOdds(a.odds, b.odds);
}

export function getTopOutcomeIndex(market: Market, chained?: ChainedMarketData): number {
  const [top] = (market.wrappedTokens ?? [])
    .map((_, index) => ({
      index,
      isWinner: isWinningOutcome(market, chained, index),
      odds: Number(market.odds?.[index] ?? Number.NaN),
    }))
    .sort(compareOutcomes);
  return top?.index ?? 0;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) return '—';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function MarketStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      <span className="font-mono text-[13px] font-semibold tabular-nums text-paper">
        {formatUsd(value)}
      </span>
    </div>
  );
}

function Tip({
  label,
  wide = false,
  alignEnd = false,
  children,
}: {
  readonly label: React.ReactNode;
  readonly wide?: boolean;
  readonly alignEnd?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <span className="outcome-tip">
      <span
        role="tooltip"
        className={`outcome-tip__text${wide ? ' outcome-tip__text--wide' : ''}${
          alignEnd ? ' outcome-tip__text--end' : ''
        }`}
      >
        {label}
      </span>
      {children}
    </span>
  );
}

function HintIcon({
  text,
  alignEnd = false,
}: {
  readonly text: string;
  readonly alignEnd?: boolean;
}) {
  return (
    <Tip label={text} wide alignEnd={alignEnd}>
      <span className="inline-flex text-brand" aria-label={text}>
        <QuestionIcon size={12} />
      </span>
    </Tip>
  );
}

function OutcomeAvatar({
  image,
  isInvalid,
  title,
}: {
  readonly image?: string;
  readonly isInvalid: boolean;
  readonly title: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const base = 'h-[38px] w-[38px] shrink-0 rounded-full';

  if (isInvalid) {
    return (
      <div className={`${base} flex items-center justify-center bg-bg-3 text-[#999]`}>
        <InvalidOutcomeIcon size={20} />
      </div>
    );
  }
  if (image && !failed) {
    return (
      <img
        src={image}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${base} bg-bg-2 object-cover dark:bg-bg-3`}
      />
    );
  }
  return <div className={`${base} bg-brand`} aria-hidden />;
}

function OutcomeSparkline({ values }: { readonly values?: number[] }) {
  const clean = (values ?? []).filter((v) => Number.isFinite(v));
  const first = clean[0];
  const last = clean[clean.length - 1];
  const hasData = clean.length >= 2 && first !== 0;
  const pct = hasData ? ((last - first) / Math.abs(first)) * 100 : 0;
  const rel = Math.abs(pct);
  const show = hasData && rel >= 0.5;
  const trendClass = !show
    ? 'outcome-spark--hidden'
    : pct > 0
      ? 'outcome-spark--up'
      : 'outcome-spark--down';
  const label = show ? `${pct >= 0 ? '+' : ''}${pct.toFixed(rel >= 10 ? 0 : 1)}%` : '';

  return (
    <div
      className={`outcome-spark ${trendClass}`}
      title={show ? `${label} · 24h` : undefined}
      aria-hidden={!show}
    >
      {show && (
        <>
          <span className="outcome-spark__pct">{label}</span>
          <svg viewBox="0 0 18 18" className="outcome-spark__glyph" aria-hidden>
            <path
              d="M1.75,12.25l3.646-3.646c.195-.195,.512-.195,.707,0l3.293,3.293c.195,.195,.512,.195,.707,0l6.146-6.146"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M12.25,5.75h4v4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </>
      )}
    </div>
  );
}

function QuickTradeButtons({
  onQuickTrade,
}: {
  readonly onQuickTrade: (mode: TradeMode) => void;
}) {
  return (
    <div className="quick-trade">
      <button
        type="button"
        className="quick-trade__btn quick-trade__btn--buy"
        onClick={(event) => {
          event.stopPropagation();
          onQuickTrade('buy');
        }}
        aria-label="Quick buy this outcome"
      >
        Buy
      </button>
      <button
        type="button"
        className="quick-trade__btn quick-trade__btn--sell"
        onClick={(event) => {
          event.stopPropagation();
          onQuickTrade('sell');
        }}
        aria-label="Quick sell this outcome"
      >
        Sell
      </button>
    </div>
  );
}

function MultiScalarEstimate({ market, odds }: { readonly market: Market; readonly odds: number }) {
  if (getMarketType(market) !== MarketTypes.MULTI_SCALAR || !isOdd(odds)) return null;
  const estimate = getMultiScalarEstimate(market, odds);
  if (estimate === null) return null;
  return (
    <div className="text-[13px] font-normal">
      ~ {estimate.value} {estimate.unit}
    </div>
  );
}

interface OutcomeCardProps {
  readonly market: Market;
  readonly row: OutcomeRow;
  readonly oddsCap?: number | null;
  readonly balance: bigint;
  readonly balanceSymbol?: string;
  readonly trend?: number[];
  readonly selected: boolean;
  readonly canQuickTrade: boolean;
  readonly isPoolOpen: boolean;
  readonly onSelect: (index: number, scroll: boolean) => void;
  readonly onQuickTrade: (index: number, mode: TradeMode) => void;
  readonly onTogglePool: (index: number) => void;
  readonly onAddLiquidity: (index: number) => void;
  readonly onViewImages: (label: string, assets: SubmissionAssets) => void;
  readonly cardRef: (el: HTMLDivElement | null) => void;
}

function OutcomeCard({
  market,
  row,
  oddsCap,
  balance,
  balanceSymbol,
  trend,
  selected,
  canQuickTrade,
  isPoolOpen,
  onSelect,
  onQuickTrade,
  onTogglePool,
  onAddLiquidity,
  onViewImages,
  cardRef,
}: OutcomeCardProps) {
  const { index, rank, label, odds, assets } = row;
  const networkName = networks.find((n) => n.id === market.chainId)?.name ?? 'explorer';
  const hasOdds = isOdd(odds) && Number.isFinite(odds);
  const hasImages = (assets?.images.length ?? 0) > 0;
  const pdfUrl = assets?.pdfUrl;
  const portfolioUrl = assets?.portfolioUrl;
  const imagesLabel = pdfUrl || portfolioUrl ? 'View images' : 'View proposal';
  const hasExtras = hasImages || Boolean(pdfUrl) || Boolean(portfolioUrl);
  const priceHint = hasOdds ? `$${(odds / 100).toFixed(3)} per share` : undefined;
  const oddsTitle = hasOdds
    ? oddsCap != null
      ? `${priceHint} · ${ODDS_CAP_HINT}`
      : priceHint
    : undefined;
  const branchUrl = `${SEER_APP_URL}/create-market?parentMarket=${row.branchMarketId}&parentOutcome=${encodeURIComponent(row.branchOutcome)}`;

  return (
    <div ref={cardRef}>
      <div
        data-selected={selected ? 'true' : undefined}
        onClick={(event) => {
          const onControl = (event.target as HTMLElement).closest?.('a, button');
          onSelect(index, !onControl);
        }}
        className={`outcome-card flex cursor-pointer items-center justify-between gap-3 p-[14px] transition-colors hover:bg-bg-2 max-sm:flex-wrap ${
          selected ? 'outcome-card--active hover:!bg-transparent' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 max-sm:w-full">
          <div className="max-lg:hidden">
            <OutcomeAvatar
              image={row.image}
              isInvalid={row.isInvalid}
              title={label}
            />
          </div>
          <div className="min-w-0 space-y-1 pb-1">
            <div className="mb-1 flex flex-wrap items-center gap-1 text-[15px] font-semibold tracking-[-0.005em] text-paper">
              <p className="min-w-0 break-words">
                <span className="text-paper">#{rank}</span> {label}
              </p>
              {row.isInvalid && <HintIcon text={INVALID_HINT} />}
              {row.isWinner && (
                <span className="inline-flex text-pos-text" title="Winning outcome">
                  <CheckCircleIcon />
                </span>
              )}
              {balance > 0n && (
                <span className="quick-btn quick-btn--pct !cursor-default">
                  {displayBalance(balance)} {balanceSymbol}
                </span>
              )}
            </div>
            <div className="outcome-actions flex min-h-[22px] flex-row flex-wrap items-center justify-start text-[12px]">
              <Tip label={`View on ${networkName}`}>
                <a
                  href={getTokenExplorerUrl(market.chainId, row.token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View on ${networkName}`}
                  className="outcome-action-icon"
                >
                  <ArrowUpRightIcon size={12} />
                </a>
              </Tip>
              <Tip label="Add Liquidity">
                <button
                  type="button"
                  onClick={() => onAddLiquidity(index)}
                  aria-label="Add Liquidity"
                  className="outcome-action-icon"
                >
                  <DropletIcon size={12} />
                </button>
              </Tip>
              <Tip label={isPoolOpen ? 'Hide pool details' : 'View pool details'}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePool(index);
                  }}
                  aria-label={isPoolOpen ? 'Hide pool details' : 'View pool details'}
                  aria-pressed={isPoolOpen}
                  className={`outcome-action-icon${isPoolOpen ? ' is-active' : ''}`}
                >
                  <LayersIcon size={12} />
                </button>
              </Tip>
              <Tip label="New conditional market">
                <a
                  href={branchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="New conditional market"
                  className="outcome-action-icon"
                >
                  <BranchIcon size={12} />
                </a>
              </Tip>
              {hasExtras && <span aria-hidden className="h-3 w-px bg-edge" />}
              {hasImages && assets ? (
                <Tip label={imagesLabel}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewImages(label, assets);
                    }}
                    aria-label={imagesLabel}
                    className="outcome-action-icon"
                  >
                    <ImageIcon size={12} />
                  </button>
                </Tip>
              ) : null}
              {pdfUrl ? (
                <Tip label="View proposal">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="View proposal"
                    className="outcome-action-icon"
                  >
                    <DocumentIcon size={12} />
                  </a>
                </Tip>
              ) : null}
              {portfolioUrl ? (
                <Tip label="View portfolio">
                  <a
                    href={portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="View portfolio"
                    className="outcome-action-icon"
                  >
                    <GlobeIcon size={12} />
                  </a>
                </Tip>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 min-[400px]:gap-2 max-sm:w-full max-sm:justify-between">
          {canQuickTrade && (
            <QuickTradeButtons onQuickTrade={(mode) => onQuickTrade(index, mode)} />
          )}
          <div className="ml-auto flex items-center gap-1.5 min-[400px]:gap-2">
            {canQuickTrade && <OutcomeSparkline values={trend} />}
            <div
              className="min-w-[48px] text-right font-display text-[20px] font-medium tabular-nums tracking-tight text-paper min-[400px]:text-[22px]"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
              title={oddsTitle}
            >
              {hasOdds ? (
                <>
                  {formatOddsWithCap(odds, oddsCap)}
                  {!row.isInvalid && <MultiScalarEstimate market={market} odds={odds} />}
                </>
              ) : (
                <div className="flex items-center justify-end gap-1.5">
                  <span className="pr-0.5">NA</span>
                  <HintIcon text={NA_HINT} alignEnd />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isPoolOpen && <OutcomePoolPanel market={market} outcomeIndex={index} />}
    </div>
  );
}

export const MarketOutcomes: React.FC<MarketOutcomesProps> = ({
  className = '',
  market,
  chained,
  selectedOutcomeIndex,
  onSelectOutcome,
  onQuickTrade,
}: MarketOutcomesProps) => {
  const wrapped = market.wrappedTokens ?? [];
  const rawOutcomes = market.outcomes ?? [];
  const odds = market.odds ?? [];
  const canQuickTrade = getMarketStatus(market) !== MarketStatus.CLOSED;
  const { data: oddsCaps } = useOddsCaps(market);
  const { data: trends } = useOutcomeTrends(market, canQuickTrade);

  const [lightbox, setLightbox] = React.useState<{
    title: string;
    images: SubmissionAssets['images'];
  } | null>(null);
  const [poolOutcomeIndex, setPoolOutcomeIndex] = React.useState<number | null>(null);
  const [liquidityOutcomeIndex, setLiquidityOutcomeIndex] = React.useState<number | null>(null);

  const ranked = React.useMemo(() => {
    const rows = wrapped.map((token, i) => {
      const label =
        typeof rawOutcomes[i] === 'string'
          ? (rawOutcomes[i] as string)
          : `Outcome ${i + 1}`;
      const chainedRow = chained?.rows[i];
      const level = chainedRow ? chained?.levels[chainedRow.level] : undefined;
      const assets = getOutcomeSubmissionAssets(market.id, label);
      const image = chainedRow
        ? level?.images?.outcomes?.[chainedRow.outcomeIndex]
        : market.images?.outcomes?.[i];
      return {
        index: i,
        label,
        odds: Number(odds[i] ?? Number.NaN),
        token,
        image: image || assets?.images[0]?.url,
        assets,
        isInvalid: chainedRow ? false : isInvalidOutcome(market, i),
        isWinner: isWinningOutcome(market, chained, i),
        branchMarketId: chainedRow?.marketId ?? market.id,
        branchOutcome: chainedRow && level
          ? (level.outcomes[chainedRow.outcomeIndex] ?? label)
          : label,
      };
    });
    return rows
      .sort(compareOutcomes)
      .map((row, rankIdx): OutcomeRow => ({ ...row, rank: rankIdx + 1 }));
  }, [wrapped, rawOutcomes, odds, market, chained]);

  const { address: account } = useAccount();
  const { data: balances } = useOutcomeBalances(account, wrapped, market.chainId);
  const heldTokens = React.useMemo(
    () => wrapped.filter((_, i) => (balances?.[i] ?? 0n) > 0n),
    [wrapped, balances]
  );
  const { data: heldTokensInfo } = useTokensInfo(
    heldTokens.length > 0 ? heldTokens : undefined,
    market.chainId
  );
  const symbolByToken = React.useMemo(() => {
    const map: Record<string, string> = {};
    heldTokens.forEach((token, i) => {
      const symbol = heldTokensInfo?.[i]?.symbol;
      if (symbol) map[token.toLowerCase()] = symbol;
    });
    return map;
  }, [heldTokens, heldTokensInfo]);

  const isLong = ranked.length > COLLAPSE_THRESHOLD;
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const needle = query.trim().toLowerCase();

  const visible = React.useMemo(() => {
    if (!isLong) return ranked;
    if (needle) {
      return ranked.filter((o) => o.label.toLowerCase().includes(needle));
    }
    if (expanded) return ranked;
    const top = ranked.slice(0, COLLAPSED_COUNT);
    const selected = ranked.find((o) => o.index === selectedOutcomeIndex);
    return selected && !top.includes(selected) ? [...top, selected] : top;
  }, [isLong, ranked, needle, expanded, selectedOutcomeIndex]);

  const cardRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const scrollCardIntoView = React.useCallback(
    (index: number, waitForPanel = false) => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      requestAnimationFrame(() => {
        scrollTimeoutRef.current = setTimeout(
          () => {
            const el = cardRefs.current[index];
            if (!el) return;
            const { top, bottom } = el.getBoundingClientRect();
            if (top >= HEADER_OFFSET && bottom <= window.innerHeight) return;
            window.scrollTo({
              top: Math.max(0, top + window.scrollY - HEADER_OFFSET),
              behavior: 'smooth',
            });
          },
          waitForPanel ? PANEL_ANIMATION_MS : 0
        );
      });
    },
    []
  );

  React.useEffect(
    () => () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    },
    []
  );

  const handleSelect = React.useCallback(
    (index: number, scroll: boolean) => {
      onSelectOutcome(index);
      if (scroll) {
        setPoolOutcomeIndex(null);
        scrollCardIntoView(index);
      }
    },
    [onSelectOutcome, scrollCardIntoView]
  );

  const handleQuickTrade = React.useCallback(
    (index: number, mode: TradeMode) => {
      if (onQuickTrade) onQuickTrade(index, mode);
      else onSelectOutcome(index);
    },
    [onQuickTrade, onSelectOutcome]
  );

  const handleTogglePool = React.useCallback(
    (index: number) => {
      const willOpen = poolOutcomeIndex !== index;
      setPoolOutcomeIndex(willOpen ? index : null);
      if (willOpen) scrollCardIntoView(index, true);
    },
    [poolOutcomeIndex, scrollCardIntoView]
  );

  const closeLiquidityModal = React.useCallback(() => setLiquidityOutcomeIndex(null), []);

  function onViewImages(label: string, assets: SubmissionAssets) {
    setLightbox({ title: label, images: assets.images });
  }

  return (
    <section
      className={`space-y-8 ${className}`}
      data-purpose="market-visualization"
    >
      <div className="lot-panel p-[22px]">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-paper">
            Outcomes
          </h2>
          <div className="flex items-baseline gap-4">
            <MarketStat label="Volume" value={market.volumeUSD} />
            <MarketStat label="Liquidity" value={market.liquidityUSD} />
          </div>
        </div>
        {isLong ? (
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${ranked.length} outcomes`}
            aria-label="Search outcomes"
            className="mb-3 w-full rounded-full border border-edge bg-plaque px-4 py-2.5 text-[13.5px] text-paper caret-up placeholder:text-muted focus:border-up focus:outline-none"
          />
        ) : null}
        <div className="space-y-2.5">
          {visible.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted">
              No outcomes match “{query.trim()}”.
            </p>
          ) : null}
          {visible.map((row) => (
            <OutcomeCard
              key={row.token}
              market={market}
              row={row}
              oddsCap={oddsCaps?.[row.index]}
              balance={account ? (balances?.[row.index] ?? 0n) : 0n}
              balanceSymbol={symbolByToken[row.token.toLowerCase()]}
              trend={trends?.[row.index]}
              selected={selectedOutcomeIndex === row.index}
              canQuickTrade={canQuickTrade}
              isPoolOpen={poolOutcomeIndex === row.index}
              onSelect={handleSelect}
              onQuickTrade={handleQuickTrade}
              onTogglePool={handleTogglePool}
              onAddLiquidity={setLiquidityOutcomeIndex}
              onViewImages={onViewImages}
              cardRef={(el) => {
                cardRefs.current[row.index] = el;
              }}
            />
          ))}
        </div>
        {isLong && !needle ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-3 text-[13px] font-medium text-muted transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
          >
            {expanded ? 'Show top outcomes' : `Show all ${ranked.length} outcomes`}
          </button>
        ) : null}
      </div>

      <div className="lot-panel p-6">
        <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
          Price History
        </h2>
        <MarketChart market={market} />
      </div>

      <MarketDiscussion market={market} />

      <AddLiquidityModal
        market={market}
        outcomeIndex={liquidityOutcomeIndex}
        outcomeLabel={
          liquidityOutcomeIndex == null ? undefined : rawOutcomes[liquidityOutcomeIndex]
        }
        onClose={closeLiquidityModal}
      />

      <SubmissionLightbox
        open={lightbox != null}
        title={lightbox?.title ?? ''}
        images={lightbox?.images ?? []}
        onClose={() => setLightbox(null)}
      />
    </section>
  );
};

export default MarketOutcomes;
