import * as React from 'react';
import type { PoolInfo } from '@seer-pm/react';
import {
  getLiquidityUrl,
  getPoolExplorerUrl,
  tickToPrice,
  type Market,
} from '@seer-pm/sdk';
import MarketChart from '../MarketChart/MarketChart';
import { useOutcomePools, usePoolTokenBalances } from '../../hooks/useOutcomePools';
import { displayBalance } from '../../utils/format';
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from './icons';

type ActiveTab = 'liquidity' | 'chart';

function PanelTab({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-8 shrink-0 px-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up ${
        active
          ? 'border-b-[3px] border-brand text-brand'
          : 'border-b border-paper/20 text-paper hover:text-brand'
      }`}
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
      aria-label={copied ? 'Copied' : 'Copy pool id'}
      title={copied ? 'Copied' : 'Copy'}
      className="outcome-action-icon"
    >
      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
    </button>
  );
}

function PoolChip({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-[6px] bg-bg-2 px-2 py-1">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
        {label}
      </span>
      <span className="font-mono font-semibold tabular-nums text-paper">{value}</span>
    </span>
  );
}

function PoolDetails({
  market,
  outcomeIndex,
  pool,
  balances,
  isLoading,
}: {
  readonly market: Market;
  readonly outcomeIndex: number;
  readonly pool: PoolInfo;
  readonly balances?: { balance0: bigint; balance1: bigint };
  readonly isLoading: boolean;
}) {
  const outcome = market.wrappedTokens[outcomeIndex]?.toLowerCase();
  const isToken0Outcome = pool.token0.toLowerCase() === outcome;
  const [price0, price1] = tickToPrice(pool.tick);
  const outcomePrice = Number(isToken0Outcome ? price0 : price1);
  const collateralSymbol = isToken0Outcome ? pool.token1Symbol : pool.token0Symbol;
  const incentive = pool.incentives[0];
  const rewardsLive = incentive && Number(incentive.realEndTime) * 1000 > Date.now();

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <p className="font-semibold">Pool Id:</p>
          <a
            href={getPoolExplorerUrl(market.chainId, pool.id)}
            title={pool.id}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-brand hover:underline"
          >
            {pool.id.slice(0, 6)}...{pool.id.slice(-4)}
          </a>
          <CopyButton text={pool.id} />
        </div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">Pool Balances:</p>
          {isLoading ? (
            <span className="h-4 w-24 animate-pulse rounded bg-bg-2" />
          ) : (
            <p className="font-mono tabular-nums">
              {balances ? displayBalance(balances.balance0) : 0} {pool.token0Symbol} /{' '}
              {balances ? displayBalance(balances.balance1) : 0} {pool.token1Symbol}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PoolChip label="DEX" value={pool.dex} />
        <PoolChip label="Fee" value={`${Number((pool.fee / 10000).toFixed(4))}%`} />
        {Number.isFinite(outcomePrice) ? (
          <PoolChip label="Price" value={`${outcomePrice.toFixed(3)} ${collateralSymbol}`} />
        ) : null}
        <PoolChip
          label="Rewards"
          value={
            rewardsLive
              ? incentive.apr === 0
                ? `${displayBalance(incentive.rewardRate * 86400n)} SEER / day`
                : `${incentive.apr.toFixed(2)}% APR`
              : 'None'
          }
        />
        <a
          href={getLiquidityUrl(market.chainId, pool.token0, pool.token1)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-up hover:underline"
        >
          Add liquidity <ArrowUpRightIcon size={12} />
        </a>
      </div>
    </div>
  );
}

function PoolTab({ market, outcomeIndex }: { readonly market: Market; readonly outcomeIndex: number }) {
  const { data: poolsData, isLoading: isLoadingPools } = useOutcomePools(market, outcomeIndex);
  const pools: PoolInfo[] = poolsData ?? [];
  const { data: balancesData, isLoading } = usePoolTokenBalances(market.chainId, pools);
  const balances: { balance0: bigint; balance1: bigint }[] = balancesData ?? [];
  const [poolId, setPoolId] = React.useState<string | undefined>(undefined);

  const firstPoolId = pools[0]?.id;
  React.useEffect(() => {
    setPoolId(firstPoolId);
  }, [firstPoolId]);

  if (isLoadingPools) {
    return <div className="h-12 w-full animate-pulse rounded-control bg-bg-2" />;
  }
  if (pools.length === 0) {
    return <p className="mt-3">No liquidity data.</p>;
  }

  const currentIndex = Math.max(
    0,
    pools.findIndex((pool) => pool.id === poolId)
  );
  const current = pools[currentIndex];

  return (
    <div className="space-y-3">
      {pools.length > 1 && (
        <div role="tablist" className="flex overflow-x-auto pb-1">
          {pools.map((pool, index) => (
            <PanelTab key={pool.id} active={pool.id === current.id} onClick={() => setPoolId(pool.id)}>
              <span className="inline-block w-[68px]">Pool {index + 1}</span>
            </PanelTab>
          ))}
        </div>
      )}
      <PoolDetails
        key={current.id}
        market={market}
        outcomeIndex={outcomeIndex}
        pool={current}
        balances={balances[currentIndex]}
        isLoading={isLoading}
      />
    </div>
  );
}

export function OutcomePoolPanel({
  market,
  outcomeIndex,
}: {
  readonly market: Market;
  readonly outcomeIndex: number;
}) {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('liquidity');
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const syncHeight = () => setMaxHeight(el.scrollHeight);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    const frame = requestAnimationFrame(() => setIsOpen(true));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-b-[3px] text-[12.5px] text-paper transition-[max-height,opacity] duration-300 ease-in-out"
      style={{ maxHeight: isOpen ? maxHeight : 0, opacity: isOpen ? 1 : 0 }}
    >
      <div ref={contentRef}>
        <div role="tablist" className="flex overflow-x-auto px-4 pt-2">
          <PanelTab active={activeTab === 'liquidity'} onClick={() => setActiveTab('liquidity')}>
            Liquidity
          </PanelTab>
          <PanelTab active={activeTab === 'chart'} onClick={() => setActiveTab('chart')}>
            Chart
          </PanelTab>
        </div>
        <div className="p-4">
          {activeTab === 'liquidity' ? (
            <div className="max-h-[600px] overflow-y-auto">
              <PoolTab market={market} outcomeIndex={outcomeIndex} />
            </div>
          ) : (
            <MarketChart market={market} outcomeIndex={outcomeIndex} />
          )}
        </div>
      </div>
    </div>
  );
}

export default OutcomePoolPanel;
