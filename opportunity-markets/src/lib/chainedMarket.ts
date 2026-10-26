import { getGraphMarketQueryFn } from '@seer-pm/react';
import {
  getActiveCollateralProfile,
  normalizeOdds,
  swaprGraphQLClient,
  tickToPrice,
  type Market,
  type PoolHourDatasSets,
  type SupportedChain,
} from '@seer-pm/sdk';
import {
  OrderDirection,
  PoolHourData_OrderBy,
  Pool_OrderBy,
  getSdk as getSwaprSdk,
} from '@seer-pm/sdk/subgraph/swapr';
import { zeroAddress, zeroHash, type Address } from 'viem';
import type { ChainedMarketLevel } from '../config/market';

/**
 * Chained "Other" markets: level i+1 is a conditional market on level i's
 * "Other" outcome. Every outcome token of every level has its own pool against
 * the base collateral (sDAI), so a pool price is already an absolute probability.
 */

export type ChainedRowKind = 'option' | 'other-link' | 'invalid';

export type ChainedRow = {
  label: string;
  token: Address;
  marketId: Address;
  level: number;
  outcomeIndex: number;
  kind: ChainedRowKind;
};

export type ChainedMarketData = {
  /** Flattened market with only the visible options, priced against sDAI. */
  market: Market;
  /** Visible rows, aligned with `market.wrappedTokens`. */
  rows: ChainedRow[];
  levels: Market[];
  /** Best sDAI pool per visible token (lowercased token address → pool id). */
  poolByToken: Record<string, string>;
};

const SUBGRAPH_PAGE = 1000;

function getRowKind(
  level: ChainedMarketLevel,
  isLastLevel: boolean,
  outcomeIndex: number,
  outcomeCount: number
): ChainedRowKind {
  // The Invalid outcome is always the last wrapped token of a Seer categorical market.
  if (outcomeIndex === outcomeCount - 1) return 'invalid';
  if (!isLastLevel && outcomeIndex === level.otherIndex) return 'other-link';
  return 'option';
}

export function flattenChainedRows(
  levelsConfig: ChainedMarketLevel[],
  levels: Market[],
  finalOtherLabel?: string
): ChainedRow[] {
  return levels.flatMap((market, level) => {
    const config = levelsConfig[level];
    const isLastLevel = level === levels.length - 1;
    const count = market.wrappedTokens.length;
    return market.wrappedTokens.map((token, outcomeIndex) => {
      const kind = getRowKind(config, isLastLevel, outcomeIndex, count);
      const raw = market.outcomes[outcomeIndex] ?? `Outcome ${outcomeIndex + 1}`;
      // The last level's "Other" is a real outcome: "none of the listed".
      const isFinalOther = isLastLevel && outcomeIndex === count - 2;
      return {
        label: isFinalOther && finalOtherLabel ? finalOtherLabel : raw,
        token,
        marketId: market.id,
        level,
        outcomeIndex,
        kind,
      };
    });
  });
}

export type SwaprPool = { id: string; liquidity: string; tick?: string | null; token0: { id: string }; token1: { id: string } };

export function getSwaprClient(chainId: SupportedChain) {
  const client = swaprGraphQLClient(chainId, 'algebra');
  if (!client) throw new Error('Swapr subgraph not available');
  return getSwaprSdk(client);
}

/** Every pool pairing one of `tokens` with `collateral`, fetched in bulk. */
export async function fetchCollateralPools(
  chainId: SupportedChain,
  tokens: Address[],
  collateral: Address
): Promise<SwaprPool[]> {
  const sdk = getSwaprClient(chainId);
  const ids = tokens.map((t) => t.toLowerCase());
  const base = collateral.toLowerCase();
  const wheres = [
    { token0_in: ids, token1: base },
    { token0: base, token1_in: ids },
  ];
  const results = await Promise.all(
    wheres.map(async (where) => {
      const pools: SwaprPool[] = [];
      for (let skip = 0; ; skip += SUBGRAPH_PAGE) {
        const { pools: page } = await sdk.GetPools({
          where,
          first: SUBGRAPH_PAGE,
          skip,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderBy: Pool_OrderBy.Liquidity as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderDirection: OrderDirection.Desc as any,
        });
        pools.push(...(page as SwaprPool[]));
        if (page.length < SUBGRAPH_PAGE) break;
      }
      return pools;
    })
  );
  return results.flat();
}

/** Most-liquid pool per outcome token (lowercased address), the one prices come from. */
export function getBestPoolByToken(
  collateral: Address,
  pools: SwaprPool[]
): Record<string, SwaprPool> {
  const base = collateral.toLowerCase();
  const best: Record<string, SwaprPool> = {};
  for (const pool of pools) {
    const token0 = pool.token0.id.toLowerCase();
    const outcome = token0 === base ? pool.token1.id.toLowerCase() : token0;
    const current = best[outcome];
    if (!current || BigInt(pool.liquidity) > BigInt(current.liquidity)) {
      best[outcome] = pool;
    }
  }
  return best;
}

function getPricesFromPools(
  tokens: Address[],
  collateral: Address,
  pools: SwaprPool[]
): { prices: number[]; poolByToken: Record<string, string> } {
  const best = getBestPoolByToken(collateral, pools);
  const poolByToken: Record<string, string> = {};
  const prices = tokens.map((token) => {
    const key = token.toLowerCase();
    const pool = best[key];
    if (!pool || BigInt(pool.liquidity) === 0n || pool.tick == null) {
      return Number.NaN;
    }
    poolByToken[key] = pool.id;
    const [price0, price1] = tickToPrice(Number(pool.tick));
    return pool.token0.id.toLowerCase() === key ? Number(price0) : Number(price1);
  });

  return { prices, poolByToken };
}

type QueryClient = Parameters<typeof getGraphMarketQueryFn>[0];

export async function fetchChainedMarket(
  queryClient: QueryClient,
  chainId: SupportedChain,
  levelsConfig: ChainedMarketLevel[],
  finalOtherLabel?: string
): Promise<ChainedMarketData> {
  const levels = await Promise.all(
    levelsConfig.map(async ({ marketId }) => {
      const market = await getGraphMarketQueryFn(queryClient, marketId, chainId);
      if (!market) throw new Error(`Market ${marketId} not found`);
      return market;
    })
  );

  const rows = flattenChainedRows(levelsConfig, levels, finalOtherLabel).filter(
    (row) => row.kind === 'option'
  );
  const tokens = rows.map((row) => row.token);
  const collateral = getActiveCollateralProfile(chainId).primary.address;

  let prices: number[] = tokens.map(() => Number.NaN);
  let poolByToken: Record<string, string> = {};
  try {
    const pools = await fetchCollateralPools(chainId, tokens, collateral);
    ({ prices, poolByToken } = getPricesFromPools(tokens, collateral, pools));
  } catch (e) {
    console.error(e);
  }

  const root = levels[0];
  const sum = (
    key: 'liquidityUSD' | 'openInterestUSD' | 'volumeUSD' | 'volumeNotionalUSD',
  ) =>
    levels.reduce((acc, m) => acc + Number(m[key] ?? 0), 0);

  const market: Market = {
    ...root,
    outcomes: rows.map((row) => row.label),
    wrappedTokens: tokens,
    collateralToken: collateral,
    collateralToken1: zeroAddress,
    collateralToken2: zeroAddress,
    parentMarket: {
      id: zeroAddress,
      conditionId: zeroHash,
      payoutReported: false,
      payoutNumerators: [],
    },
    parentOutcome: 0n,
    parentCollectionId: zeroHash,
    odds: normalizeOdds(prices),
    liquidityUSD: sum('liquidityUSD'),
    openInterestUSD: sum('openInterestUSD'),
    volumeUSD: sum('volumeUSD'),
    volumeNotionalUSD: sum('volumeNotionalUSD'),
    hasLiquidity: Object.keys(poolByToken).length > 0,
  };

  return { market, rows, levels, poolByToken };
}

/**
 * Hourly pool data for `tokens` (sDAI pools), shaped like the `market-chart`
 * API response: one ascending series per token, empty when it has no pool.
 */
export async function fetchChainedPoolHourDatas(
  chainId: SupportedChain,
  tokens: Address[],
  poolByToken: Record<string, string>,
  since = 0
): Promise<PoolHourDatasSets> {
  const poolIds = [
    ...new Set(tokens.map((t) => poolByToken[t.toLowerCase()]).filter(Boolean)),
  ];
  if (poolIds.length === 0) return tokens.map(() => []);

  const sdk = getSwaprClient(chainId);
  const all: PoolHourDatasSets[number] = [];
  let cursor = since;
  for (;;) {
    const { poolHourDatas } = await sdk.GetPoolHourDatas({
      where: { pool_in: poolIds, periodStartUnix_gt: cursor },
      first: SUBGRAPH_PAGE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: PoolHourData_OrderBy.PeriodStartUnix as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderDirection: OrderDirection.Asc as any,
    });
    all.push(...poolHourDatas);
    if (poolHourDatas.length < SUBGRAPH_PAGE) break;
    // Pages can split a timestamp shared by several pools; back off one second
    // so the next page re-reads it, then drop duplicates below.
    cursor = poolHourDatas[poolHourDatas.length - 1].periodStartUnix - 1;
  }

  const byPool: Record<string, PoolHourDatasSets[number]> = {};
  const seen = new Set<string>();
  for (const item of all) {
    const key = `${item.pool.id}-${item.periodStartUnix}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (byPool[item.pool.id] ??= []).push(item);
  }

  return tokens.map((t) => byPool[poolByToken[t.toLowerCase()]] ?? []);
}

/** Share of the collateral one outcome token of `market` redeems for, ignoring any parent. */
function getPayoutShare(market: Market, outcomeIndex: number): number {
  if (!market.payoutReported) return 0;
  const sum = market.payoutNumerators.reduce((acc, n) => acc + Number(n), 0);
  return sum === 0 ? 0 : Number(market.payoutNumerators[outcomeIndex] ?? 0n) / sum;
}

/**
 * Base collateral one token of `levels[level]`'s outcome is finally worth: its
 * own payout times the payout of the "Other" outcome of every level above it.
 */
export function getChainedRedeemValue(
  levels: Market[],
  level: number,
  outcomeIndex: number
): number {
  let value = getPayoutShare(levels[level], outcomeIndex);
  for (let k = level; k > 0 && value > 0; k -= 1) {
    value *= getPayoutShare(levels[k - 1], Number(levels[k].parentOutcome));
  }
  return value;
}
