import * as React from 'react';
import { parseUnits, type Address } from 'viem';
import {
  TradeType,
  WRAPPED_OUTCOME_TOKEN_DECIMALS,
  buildMintToCoverQuote,
  type CompleteSetQuoteResult,
  type Market,
  type MintToCoverStatus,
  type Token,
} from '@seer-pm/sdk';

interface UseMintToCoverProps {
  market: Market;
  parentMarkets: Market[] | undefined;
  outcomeIndex: number;
  selectedCollateral: Token;
  swapType: 'buy' | 'sell';
  account: Address | undefined;
  /** The amount the quote was fetched for, so the cover matches the quote. */
  amount: string;
  outcomeBalance: bigint;
  collateralBalance: bigint;
  quoteData: CompleteSetQuoteResult | undefined;
}

/**
 * Selling more shares than the wallet holds: mint the shortfall as a full set
 * from the market collateral and sell the whole amount (a short on the
 * outcome). Returns `off` whenever the plain sell applies.
 */
export function useMintToCover({
  market,
  parentMarkets,
  outcomeIndex,
  selectedCollateral,
  swapType,
  account,
  amount,
  outcomeBalance,
  collateralBalance,
  quoteData,
}: UseMintToCoverProps): MintToCoverStatus {
  return React.useMemo(() => {
    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(amount || '0', WRAPPED_OUTCOME_TOKEN_DECIMALS);
    } catch {
      return { kind: 'off' };
    }
    if (parsedAmount <= outcomeBalance) {
      return { kind: 'off' };
    }
    return buildMintToCoverQuote({
      market,
      parentMarkets,
      outcomeIndex,
      selectedCollateral,
      swapType,
      tradeType: TradeType.EXACT_INPUT,
      account,
      outcomeBalance,
      collateralBalance,
      directQuote: quoteData,
    });
  }, [
    market,
    parentMarkets,
    outcomeIndex,
    selectedCollateral,
    swapType,
    account,
    amount,
    outcomeBalance,
    collateralBalance,
    quoteData,
  ]);
}
