import { SEER_LINK_URL } from '../config/seerLink';
import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MainHeader from '../components/MainHeader';
import MarketOutcomes, { getTopOutcomeIndex } from '../components/MarketOutcomes';
import TradingWidget from '../components/TradingWidget';
import type { TradeModeRequest } from '../components/SwapWidget';
import DesignCarousel from '../components/DesignCarousel';
import Footer from '../components/Footer';
import { useOpportunityMarket } from '../hooks/useChainedMarket';
import { Address, zeroAddress } from 'viem';
import {
  SupportedChain,
  MarketStatus,
  getMarketStatus,
} from '@seer-pm/sdk';
import { networks } from '../config/wagmi';
import {
  getMarketDisplayTitle,
  getMarketOverride,
} from '../config/market';
import { parseOutcomeSearchParam } from '../config/submissions';

function MarketPageShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-wall">
      <MainHeader />
      <main className="mx-auto w-full max-w-shell flex-1 px-6 py-10 lg:px-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export const MarketPage: React.FC = () => {
  const { chainId, marketId = zeroAddress } = useParams<{
    chainId: string;
    marketId: Address;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: market, chained, isLoading, isError, refetch } = useOpportunityMarket(
    marketId,
    Number(chainId ?? 0) as SupportedChain
  );

  const outcomeCount = market?.wrappedTokens?.length ?? 0;
  const outcomeParam = searchParams.get('outcome');
  const topOutcomeIndex = React.useMemo(
    () => (market ? getTopOutcomeIndex(market, chained) : 0),
    [market, chained]
  );
  const selectedOutcomeIndex =
    outcomeParam == null || outcomeParam === ''
      ? topOutcomeIndex
      : parseOutcomeSearchParam(outcomeParam, outcomeCount);
  const [requestedMode, setRequestedMode] = React.useState<TradeModeRequest>();

  const setSelectedOutcome = React.useCallback(
    (index: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('outcome', String(index));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const initializedMarketRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!market || initializedMarketRef.current === market.id) return;
    initializedMarketRef.current = market.id;
    if (outcomeParam == null || outcomeParam === '') {
      setSelectedOutcome(getTopOutcomeIndex(market, chained));
    }
  }, [market, chained, outcomeParam, setSelectedOutcome]);

  const quickTrade = React.useCallback(
    (index: number, mode: TradeModeRequest['mode']) => {
      setSelectedOutcome(index);
      setRequestedMode({ mode, nonce: Date.now() });
      if (!window.matchMedia('(min-width: 1024px)').matches) {
        document.getElementById('trade')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [setSelectedOutcome]
  );

  if (!chainId || !marketId) {
    return (
      <MarketPageShell>
        <div className="lot-panel p-8">
          <p className="text-base text-paper">Invalid market URL.</p>
          <Link
            to="/"
            className="mt-4 inline-flex text-sm font-semibold text-up hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
          >
            Back to opportunities
          </Link>
        </div>
      </MarketPageShell>
    );
  }

  if (isLoading) {
    return (
      <MarketPageShell>
        <div className="lot-panel p-10 text-center">
          <p className="text-base text-muted">Loading market…</p>
        </div>
      </MarketPageShell>
    );
  }

  if (isError || !market) {
    return (
      <MarketPageShell>
        <div className="lot-panel flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-base text-paper">
            Could not load this market. Check the URL or try again.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className="sb-cta px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
            >
              Retry
            </button>
            <Link
              to="/"
              className="sb-ghost px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
            >
              Back to opportunities
            </Link>
          </div>
        </div>
      </MarketPageShell>
    );
  }

  const isClosed = getMarketStatus(market) === MarketStatus.CLOSED;
  const marketStatusText = isClosed ? 'Finalized' : 'Active';

  const override = getMarketOverride(market.id);
  const displayTitle = getMarketDisplayTitle(market.id, market.marketName);
  const descriptionParagraphs = (override?.description ?? '')
    .split(/\n\n+/)
    .filter(Boolean);

  const chain = networks.find((n) => n.id === market.chainId);
  const blockExplorerUrl = chain?.blockExplorers?.default?.url;
  const contractAddressDisplay = `${market.id.slice(0, 6)}...${market.id.slice(-4)}`;

  const metaItems = [
    {
      key: 'contract',
      label: 'Contract',
      value: (
        <a
          href={
            blockExplorerUrl
              ? `${blockExplorerUrl}/address/${market.id}`
              : undefined
          }
          target="_blank"
          rel="noreferrer"
          className="text-paper hover:text-up hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          {contractAddressDisplay}
        </a>
      ),
    },
    {
      key: 'seer',
      label: null,
      value: (
        <a
          href={`${SEER_LINK_URL}/markets/${market.chainId}/${market.url}`}
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-paper hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          View on Seer ↗
        </a>
      ),
    },
  ];

  return (
    <MarketPageShell>
      <nav
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
        aria-label="Market navigation"
      >
        <Link
          to={isClosed ? '/archive' : '/'}
          className="inline-flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          <span aria-hidden>←</span>
          {isClosed ? 'Back to archive' : 'Back to opportunities'}
        </Link>
        <a
          href="#trade"
          className="inline-flex rounded-full border border-edge px-3.5 py-1.5 text-[13px] font-semibold text-paper transition-colors hover:bg-bg-2 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          {isClosed ? 'Jump to redeem' : 'Jump to trade'}
        </a>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <section className="lot-panel flex flex-col gap-5 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  isClosed
                    ? 'rounded-full bg-bg-2 px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted'
                    : 'rounded-full bg-blue-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-blue-text'
                }
              >
                {marketStatusText}
              </span>
            </div>
            <h1 className="max-w-4xl font-display text-[22px] font-medium leading-tight tracking-[-0.025em] text-paper sm:text-[26px]">
              {displayTitle}
            </h1>
            {descriptionParagraphs.length > 0 && (
              <div className="max-w-2xl space-y-3">
                {descriptionParagraphs.map((para, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? 'text-sm font-medium leading-relaxed text-paper'
                        : 'text-sm leading-relaxed text-muted'
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}
            <dl className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge pt-4">
              {metaItems.map((item) => (
                <div
                  key={item.key}
                  className="flex min-w-0 items-baseline gap-2"
                >
                  {item.label != null && (
                    <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
                      {item.label}
                    </dt>
                  )}
                  <dd className="truncate text-[13px] text-muted">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <DesignCarousel
            market={market}
            variant="detail"
            selectedOutcomeIndex={selectedOutcomeIndex}
            onSelectOutcome={setSelectedOutcome}
          />

          <MarketOutcomes
            market={market}
            chained={chained}
            selectedOutcomeIndex={selectedOutcomeIndex}
            onSelectOutcome={setSelectedOutcome}
            onQuickTrade={quickTrade}
          />
        </div>

        <TradingWidget
          market={market}
          chained={chained}
          outcomeIndex={selectedOutcomeIndex}
          onOutcomeIndexChange={setSelectedOutcome}
          requestedMode={requestedMode}
          className="scroll-mt-28 lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
        />
      </div>
    </MarketPageShell>
  );
};

export default MarketPage;
