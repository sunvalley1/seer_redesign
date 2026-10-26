import type { SupportedChain } from '@seer-pm/sdk';
import type { Market } from '@seer-pm/sdk';
import { fetchChartData } from '@seer-pm/sdk';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { getChainedLevels } from '../../config/market';
import { fetchChainedPoolHourDatas } from '../../lib/chainedMarket';
import { useChainedMarket } from '../useChainedMarket';
import { filterChartData } from './utils';

export type ChartData = {
  chartData: {
    name: string;
    type: string;
    data: number[][];
  }[];
  timestamps: number[];
};

const getUseChartDataKey = (
  chainId: SupportedChain,
  marketId: Address,
  dayCount: number,
  intervalSeconds: number
) => ['useChartData', chainId, marketId, dayCount, intervalSeconds];

export const getUsePoolHourDataSetsKey = (chainId: SupportedChain, marketId: Address) => [
  'usePoolHourDataSets',
  chainId,
  marketId,
];

export const usePoolHourDataSets = (market: Market, enabled = true) => {
  return useQuery({
    enabled: !!market && enabled,
    queryKey: getUsePoolHourDataSetsKey(market.chainId, market.id),
    retry: false,
    queryFn: () => fetchChartData(market),
    refetchOnMount: 'always',
  });
};

/** Default "All" period: ~10 years, 30-minute buckets. */
const DEFAULT_DAY_COUNT = 365 * 10;
const DEFAULT_INTERVAL_SECONDS = 60 * 30;

export const useChartData = (market: Market, enabled = true) => {
  const { data: poolHourDataSets } = usePoolHourDataSets(market, enabled);
  return useQuery({
    enabled: poolHourDataSets !== undefined,
    queryKey: [
      ...getUseChartDataKey(
        market.chainId,
        market.id,
        DEFAULT_DAY_COUNT,
        DEFAULT_INTERVAL_SECONDS
      ),
      JSON.stringify(
        Array.isArray(poolHourDataSets)
          ? poolHourDataSets.map((x) => x.length)
          : poolHourDataSets
      ),
    ],
    retry: false,
    queryFn: async (): Promise<ChartData> =>
      filterChartData(
        market,
        poolHourDataSets!,
        DEFAULT_DAY_COUNT,
        DEFAULT_INTERVAL_SECONDS,
        undefined
      ),
  });
};

/** Series drawn for a chained market; the rest of its outcomes stay off the chart. */
const CHAINED_CHART_SERIES = 10;

/**
 * Chart for a flattened chained market: the `market-chart` API prices each level
 * against its own collateral, so read the top outcomes' sDAI pools from the subgraph.
 */
export const useChainedChartData = (
  market: Market,
  enabled = true,
  outcomeIndex?: number
) => {
  const { data: chained } = useChainedMarket(market.id, market.chainId);
  const poolByToken = chained?.poolByToken;

  const chartMarket = (() => {
    const ranked = market.wrappedTokens
      .map((token, i) => ({ token, i, odds: Number(market.odds?.[i] ?? Number.NaN) }))
      .filter(
        ({ token, i, odds }) =>
          poolByToken?.[token.toLowerCase()] &&
          Number.isFinite(odds) &&
          (outcomeIndex === undefined || i === outcomeIndex)
      )
      .sort((a, b) => b.odds - a.odds)
      .slice(0, CHAINED_CHART_SERIES);
    const indexes = ranked.map(({ token }) => market.wrappedTokens.indexOf(token));
    return {
      ...market,
      wrappedTokens: indexes.map((i) => market.wrappedTokens[i]),
      outcomes: indexes.map((i) => market.outcomes[i]),
    };
  })();

  return useQuery({
    enabled: enabled && poolByToken !== undefined,
    queryKey: [
      'useChainedChartData',
      market.chainId,
      market.id,
      chartMarket.wrappedTokens,
    ],
    retry: false,
    queryFn: async (): Promise<ChartData> => {
      if (chartMarket.wrappedTokens.length === 0) {
        return { chartData: [], timestamps: [] };
      }
      const poolHourDataSets = await fetchChainedPoolHourDatas(
        market.chainId,
        chartMarket.wrappedTokens,
        poolByToken!
      );
      return filterChartData(
        chartMarket,
        poolHourDataSets,
        DEFAULT_DAY_COUNT,
        DEFAULT_INTERVAL_SECONDS,
        undefined
      );
    },
  });
};

export const useMarketChartData = (market: Market, outcomeIndex?: number) => {
  const isChained = Boolean(getChainedLevels(market.id));
  const plain = useChartData(market, !isChained);
  const chained = useChainedChartData(market, isChained, outcomeIndex);
  return isChained ? chained : plain;
};

const TREND_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;

/** Last 24h of hourly odds per outcome, aligned with `market.wrappedTokens`. */
export const useOutcomeTrends = (market: Market, enabled = true) => {
  const isChained = Boolean(getChainedLevels(market.id));
  const { data: poolHourDataSets } = usePoolHourDataSets(market, enabled && !isChained);
  const { data: chained } = useChainedMarket(market.id, market.chainId);
  const poolByToken = chained?.poolByToken;

  return useQuery({
    enabled: enabled && (isChained ? poolByToken !== undefined : poolHourDataSets !== undefined),
    queryKey: [
      'useOutcomeTrends',
      market.chainId,
      market.id,
      isChained ? Object.keys(poolByToken ?? {}).length : poolHourDataSets?.length,
    ],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<(number[] | undefined)[]> => {
      const indexes = isChained
        ? market.wrappedTokens
            .map((token, i) => (poolByToken![token.toLowerCase()] ? i : -1))
            .filter((i) => i >= 0)
        : market.wrappedTokens.map((_, i) => i);
      const trends: (number[] | undefined)[] = market.wrappedTokens.map(() => undefined);
      if (indexes.length === 0) return trends;

      const sets = isChained
        ? await fetchChainedPoolHourDatas(
            market.chainId,
            indexes.map((i) => market.wrappedTokens[i]),
            poolByToken!,
            Math.floor(Date.now() / 1000) - TREND_LOOKBACK_SECONDS
          )
        : poolHourDataSets!;

      await Promise.all(
        indexes.map(async (outcomeIndex, j) => {
          const { chartData } = await filterChartData(
            {
              ...market,
              wrappedTokens: [market.wrappedTokens[outcomeIndex]],
              outcomes: [market.outcomes[outcomeIndex]],
            },
            [sets[j] ?? []],
            1,
            60 * 60,
            undefined
          );
          trends[outcomeIndex] = chartData[0]?.data.map(([, value]) => Number(value));
        })
      );
      return trends;
    },
  });
};
