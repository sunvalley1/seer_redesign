import { useQuery } from '@tanstack/react-query';
import { useConfig } from 'wagmi';
import { fetchTokenBalance, getPools, type PoolInfo } from '@seer-pm/react';
import { getOutcomePoolPairs, type Market, type SupportedChain } from '@seer-pm/sdk';

/** Pools of a single outcome, fetched only when asked for. */
export function useOutcomePools(
  market: Market,
  outcomeIndex: number | null,
  enabled = true
) {
  const config = useConfig();
  const token =
    outcomeIndex == null ? undefined : market.wrappedTokens[outcomeIndex];
  return useQuery({
    queryKey: [
      'useOutcomePools',
      market.chainId,
      market.collateralToken.toLowerCase(),
      token?.toLowerCase(),
    ],
    enabled: enabled && token != null,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<PoolInfo[]> => {
      const pools = await Promise.all(
        getOutcomePoolPairs(market, outcomeIndex!).map((pair) =>
          getPools(market.chainId, config).fetch(pair)
        )
      );
      return pools.flat();
    },
  });
}

/** Token balances held by each pool, aligned with `pools`. */
export function usePoolTokenBalances(
  chainId: SupportedChain,
  pools: readonly PoolInfo[]
) {
  const config = useConfig();
  return useQuery({
    enabled: pools.length > 0,
    queryKey: ['usePoolTokensBalances', chainId, pools.map((pool) => pool.id)],
    refetchOnWindowFocus: true,
    queryFn: () =>
      Promise.all(
        pools.map(async ({ id, token0, token1 }) => ({
          balance0: await fetchTokenBalance(config, token0, id, chainId),
          balance1: await fetchTokenBalance(config, token1, id, chainId),
        }))
      ),
  });
}
