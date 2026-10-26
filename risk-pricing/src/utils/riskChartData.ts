import { Address } from "viem";

import { PoolHourData } from "@/types/market-types";

import {
  isTwoStringsEqual,
  sqrtPriceX96ToPrice,
} from "@/hooks/liquidity/utils";

export const GRID_STEP_SECONDS = 60 * 60 * 4;

// Solving is coupled across all assets, so a single degenerate price poisons
// every series at that timestamp - not just its own. Rows outside this band are
// dropped rather than clamped.
const MIN_VALID_PRICE = 1e-9;
const MAX_VALID_PRICE = 0.5;

/**
 * Uniform timestamp grid, always strictly increasing.
 *
 * `to` is appended so the chart reaches the current moment even when it does not
 * land on a step boundary (it almost never does). The guard matters:
 * lightweight-charts rejects non-strictly-increasing time values, so appending
 * unconditionally throws whenever `to` is already the last grid point.
 */
export const buildGrid = (
  from: number,
  to: number,
  stepSec: number = GRID_STEP_SECONDS,
): number[] => {
  if (from > to) return [];

  const out: number[] = [];
  for (let t = from; t <= to; t += stepSec) out.push(t);
  if (out.length === 0 || out[out.length - 1] < to) out.push(to);

  return out;
};

/**
 * Outcome token price from a pool snapshot.
 *
 * Mirrors useMarketData.ts exactly (sqrtPrice -> sqrtPriceX96ToPrice, then pick
 * the side matching the outcome token). The chart's last point has to equal the
 * bar chart's value, so both must derive price the same way - notably NOT via
 * the token0Price/token1Price fields.
 */
export const poolHourDataToPrice = (
  dataPoint: PoolHourData,
  outcomeId: Address,
): number => {
  const [price0, price1] = sqrtPriceX96ToPrice(
    BigInt(dataPoint.sqrtPrice),
    undefined,
    true,
  );
  return isTwoStringsEqual(outcomeId, dataPoint.pool.token0.id)
    ? Number(price0)
    : Number(price1);
};

/**
 * Resample every outcome's pool history onto a shared grid, producing one price
 * vector per timestamp for the batch solver.
 *
 * Step-hold semantics: each grid point takes the most recent snapshot at or
 * before it. Pool arrays are sparse, gappy, and not aligned with each other, so
 * a moving pointer per outcome walks them in a single pass.
 *
 * Leading gaps are handled by truncation, not zero-fill: the grid starts at the
 * first point where *every* outcome has data. A zero price would otherwise be
 * fed to the solver as a real target and corrupt all assets at that timestamp.
 */
export const buildPriceMatrix = (
  chartData: PoolHourData[][],
  wrappedTokens: Address[],
  grid: number[],
): { times: number[]; matrix: number[][] } => {
  const empty = { times: [], matrix: [] };
  if (!chartData.length || !grid.length) return empty;

  const sorted = chartData.map((points) =>
    [...points].sort((a, b) => a.periodStartUnix - b.periodStartUnix),
  );

  // Every outcome must have at least one snapshot before the grid can start.
  if (sorted.some((points) => points.length === 0)) return empty;
  const firstUsable = Math.max(
    ...sorted.map((points) => points[0].periodStartUnix),
  );

  const pointers = new Array(sorted.length).fill(0);
  const times: number[] = [];
  const matrix: number[][] = [];

  for (const time of grid) {
    if (time < firstUsable) continue;

    const row = sorted.map((points, index) => {
      let ptr = pointers[index];
      while (
        ptr + 1 < points.length &&
        points[ptr + 1].periodStartUnix <= time
      ) {
        ptr++;
      }
      pointers[index] = ptr;
      return poolHourDataToPrice(points[ptr], wrappedTokens[index]);
    });

    if (
      row.some(
        (price) =>
          !isFinite(price) ||
          price <= MIN_VALID_PRICE ||
          price >= MAX_VALID_PRICE,
      )
    ) {
      continue;
    }

    times.push(time);
    matrix.push(row);
  }

  if (!matrix.length) return empty;

  // Anchor the final row to each pool's latest snapshot, the same expression
  // useMarketData uses for the bars. Without this, "the chart ends where the
  // bars are" would be incidental - and would silently drift whenever the
  // subgraph returns a bucket past `to`, or once endTime < now.
  const latest = sorted.map((points, index) =>
    poolHourDataToPrice(points[points.length - 1], wrappedTokens[index]),
  );
  if (
    latest.every(
      (price) =>
        isFinite(price) && price > MIN_VALID_PRICE && price < MAX_VALID_PRICE,
    )
  ) {
    matrix[matrix.length - 1] = latest;
  }

  return { times, matrix };
};
