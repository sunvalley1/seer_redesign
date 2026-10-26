import { useQuery } from '@tanstack/react-query';
import type { Market } from '@seer-pm/sdk';
import { fetchOddsCaps } from '../lib/liquidityCap';

/**
 * Per outcome of `market`: the odds where its pool runs out of liquidity, when
 * the price is at or near that edge (see liquidityCap.ts), else null.
 */
export function useOddsCaps(market: Market | undefined) {
  const tokens = market?.wrappedTokens ?? [];
  return useQuery({
    // Prefixed with `useMarketOdds` so the SDK's invalidateAfterTrade refreshes it.
    queryKey: [
      'useMarketOdds',
      'caps',
      market?.chainId,
      market?.collateralToken?.toLowerCase(),
      tokens.map((t) => t.toLowerCase()).join(','),
    ],
    enabled: market != null && tokens.length > 0,
    queryFn: () => fetchOddsCaps(market!.chainId, tokens, market!.collateralToken),
    staleTime: 60_000,
  });
}
