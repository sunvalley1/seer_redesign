import { useMemo } from "react";

import { Address, formatUnits } from "viem";

import { useSDaiPrice } from "./useSDaiPrice";
import { useTokenBalance } from "./useTokenBalance";

/**
 * @returns price of token in xDai/ dollar
 */
export const useRiskTokenPositionValue = (
  token: Address,
  underlyingToken: Address,
  address: Address,
  marketPrice: number,
) => {
  const { data: balanceData } = useTokenBalance({
    token: token,
    address: address,
  });
  const balance = balanceData?.value;

  const { price: sDaiPrice } = useSDaiPrice();

  const price = marketPrice * sDaiPrice;

  const normalizedBalance = useMemo(
    () => parseFloat(formatUnits(balance ?? 0n, 18)),
    [balance],
  );

  const value = useMemo(
    () => normalizedBalance * price,
    [normalizedBalance, price],
  );

  return { balance, value, price };
};
