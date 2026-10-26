import { useMarkets } from '@seer-pm/react';
import { MarketStatus, getMarketStatus, type Market } from '@seer-pm/sdk';
import {
  CONFIGURED_MARKET_IDS,
  DEFAULT_MARKET_CHAIN_ID,
  getChainedLevels,
} from '../config/market';
import { useChainedMarkets } from './useChainedMarket';

// Chained opportunities are loaded as one flattened market each, not as raw Seer markets.
const CHAINED_MARKET_IDS = CONFIGURED_MARKET_IDS.filter((id) => getChainedLevels(id));
const PLAIN_MARKET_IDS = CONFIGURED_MARKET_IDS.filter((id) => !getChainedLevels(id));

export function isFinalized(market: Market): boolean {
  return getMarketStatus(market) === MarketStatus.CLOSED;
}

function rankMarkets(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => {
    const liqA = Number(a.liquidityUSD ?? 0);
    const liqB = Number(b.liquidityUSD ?? 0);
    return liqB - liqA;
  });
}

/** Every configured opportunity (plain and chained), ranked by liquidity. */
export function useMarketList() {
  const {
    data,
    isLoading: isPlainLoading,
    isError,
    refetch,
    isFetching: isPlainFetching,
  } = useMarkets({
    chainsList: [String(DEFAULT_MARKET_CHAIN_ID)],
    marketIds: PLAIN_MARKET_IDS,
  });
  const chainedQueries = useChainedMarkets(
    CHAINED_MARKET_IDS,
    DEFAULT_MARKET_CHAIN_ID
  );
  const isLoading =
    isPlainLoading || chainedQueries.some((q) => q.isLoading);
  const isFetching =
    isPlainFetching || chainedQueries.some((q) => q.isFetching);
  const chainedMarkets = chainedQueries
    .map((q) => q.data?.market)
    .filter((m): m is Market => m !== undefined);

  const markets = rankMarkets([...(data?.markets ?? []), ...chainedMarkets]);

  return { markets, isLoading, isError, isFetching, refetch };
}
