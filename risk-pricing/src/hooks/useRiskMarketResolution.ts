"use client";
import { useMemo } from "react";

import { useGetWinningOutcomes } from "./useGetWinningOutcomes";
import { useRawMarketData } from "./useMarketData";

/**
 * Resolution state of the 1-level multicategorical risk pricing market.
 *
 * Uses GnosisRouter.getWinningOutcomes(conditionId) on-chain as the
 * authoritative resolved gate, and the payout numerators reported by the
 * Seer API to compute each outcome's share of the collateral
 * (payoutFractions[i] = numerator_i / denominator).
 */
export const useRiskMarketResolution = () => {
  const { data, isLoading: isLoadingMarket } = useRawMarketData();
  const marketData = data?.marketData;

  const { data: winningOutcomes, isLoading: isLoadingWinningOutcomes } =
    useGetWinningOutcomes(marketData?.conditionId);

  const isResolved = useMemo(
    () => !!winningOutcomes?.some((isWinning) => isWinning),
    [winningOutcomes],
  );

  const payoutFractions = useMemo(() => {
    const numerators = marketData?.payoutNumerators;
    if (numerators && numerators.length > 0) {
      const denominator = numerators.reduce((acc, n) => acc + n, 0n);
      if (denominator > 0n)
        return numerators.map((n) => Number(n) / Number(denominator));
    }
    // fallback if the API has not reported payouts yet: split equally
    // between the on-chain winning outcomes
    if (winningOutcomes && isResolved) {
      const winnersCount = winningOutcomes.filter(Boolean).length;
      return winningOutcomes.map((isWinning) =>
        isWinning ? 1 / winnersCount : 0,
      );
    }
    return undefined;
  }, [marketData?.payoutNumerators, winningOutcomes, isResolved]);

  return {
    isResolved,
    winningOutcomes,
    payoutFractions,
    isLoading: isLoadingMarket || isLoadingWinningOutcomes,
  };
};
