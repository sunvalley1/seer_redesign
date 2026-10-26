import {
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMarket } from '@seer-pm/react';
import type { Market, SupportedChain } from '@seer-pm/sdk';
import { zeroAddress, type Address } from 'viem';
import { getChainedLevels, getMarketOverride } from '../config/market';
import { fetchChainedMarket, type ChainedMarketData } from '../lib/chainedMarket';

// Prefixed with `useMarketOdds` so the SDK's invalidateAfterTrade refreshes prices.
export const getUseChainedMarketKey = (chainId: SupportedChain, rootId: string) => [
  'useMarketOdds',
  'chained',
  chainId,
  rootId.toLowerCase(),
];

function chainedMarketQuery(
  queryClient: ReturnType<typeof useQueryClient>,
  rootId: string,
  chainId: SupportedChain
) {
  const levels = getChainedLevels(rootId);
  return {
    queryKey: getUseChainedMarketKey(chainId, rootId),
    enabled: Boolean(levels),
    queryFn: (): Promise<ChainedMarketData> =>
      fetchChainedMarket(
        queryClient,
        chainId,
        levels!,
        getMarketOverride(rootId)?.finalOtherLabel
      ),
  };
}

export function useChainedMarket(rootId: string, chainId: SupportedChain) {
  const queryClient = useQueryClient();
  return useQuery(chainedMarketQuery(queryClient, rootId, chainId));
}

export function useChainedMarkets(
  rootIds: string[],
  chainId: SupportedChain
): ReturnType<typeof useChainedMarket>[] {
  const queryClient = useQueryClient();
  return useQueries({
    queries: rootIds.map((id) => chainedMarketQuery(queryClient, id, chainId)),
  });
}

/**
 * The market an opportunity page renders: the flattened virtual market when the
 * opportunity spans chained markets, otherwise the plain Seer market.
 */
export function useOpportunityMarket(marketId: Address, chainId: SupportedChain) {
  const isChained = Boolean(getChainedLevels(marketId));
  const plain = useMarket(isChained ? zeroAddress : marketId, chainId);
  const chained = useChainedMarket(marketId, chainId);

  if (!isChained) return { ...plain, chained: undefined };
  return {
    data: chained.data?.market as Market | undefined,
    /** The real levels behind the flattened market, for trades that touch them. */
    chained: chained.data,
    isLoading: chained.isLoading,
    isError: chained.isError,
    refetch: chained.refetch,
  };
}
