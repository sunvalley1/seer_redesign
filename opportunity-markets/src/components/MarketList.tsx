import * as React from 'react';
import type { Market } from '@seer-pm/sdk';
import { MarketPreviewCard } from './MarketPreviewCard';

export interface MarketListProps {
  readonly markets: Market[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly refetch: () => unknown;
  readonly emptyText: string;
}

export const MarketList: React.FC<MarketListProps> = ({
  markets,
  isLoading,
  isError,
  refetch,
  emptyText,
}) => {
  const bootAtRef = React.useRef(
    typeof performance !== 'undefined' ? performance.now() : 0
  );

  const lotsReady = !isLoading && !isError && markets.length > 0;
  const cascadeModeRef = React.useRef<'synced' | 'late' | null>(null);
  if (lotsReady && cascadeModeRef.current === null) {
    cascadeModeRef.current =
      performance.now() - bootAtRef.current > 900 ? 'late' : 'synced';
  }
  const cascadeLate = cascadeModeRef.current === 'late';

  return (
    <div
      className={
        lotsReady
          ? cascadeLate
            ? 'lot-stack--ready lot-stack--late mt-8 flex min-w-0 flex-col gap-4 sm:mt-10 sm:gap-5'
            : 'lot-stack--ready mt-8 flex min-w-0 flex-col gap-4 sm:mt-10 sm:gap-5'
          : 'mt-8 flex min-w-0 flex-col gap-4 sm:mt-10 sm:gap-5'
      }
    >
      {isLoading && (
        <div className="lot-panel p-10 text-center">
          <p className="text-base text-muted">Loading opportunities…</p>
        </div>
      )}
      {isError && (
        <div className="lot-panel flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-base text-paper">
            Could not load opportunities. Check your connection and try
            again.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="sb-cta px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !isError && markets.length === 0 && (
        <div className="lot-panel p-10 text-center">
          <p className="text-base text-muted">{emptyText}</p>
        </div>
      )}
      {markets.map((market, index) => (
        <MarketPreviewCard
          key={`${market.chainId}-${market.id}`}
          market={market}
          cascadeIndex={index}
        />
      ))}
    </div>
  );
};

export default MarketList;
