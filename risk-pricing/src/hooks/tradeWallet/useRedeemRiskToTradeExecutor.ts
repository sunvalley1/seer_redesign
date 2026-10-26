import { useMutation, useQueryClient } from "@tanstack/react-query";
import { writeContract } from "@wagmi/core";
import { Address, encodeFunctionData, erc20Abi } from "viem";

import { TradeExecutorAbi } from "@/contracts/abis/TradeExecutorAbi";
import { gnosisRouterAbi, gnosisRouterAddress } from "@/generated";
import { config } from "@/wagmiConfig";

import { waitForTransaction } from "@/utils/waitForTransaction";

import { collateral, DEFAULT_CHAIN } from "@/consts";
import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

interface RedeemProps {
  tradeExecutor: Address;
  // wrapped outcome tokens of the risk pricing market
  tokens: Address[];
  amounts: bigint[];
  outcomeIndexes: bigint[];
}

async function redeemRiskToTradeExecutor({
  tradeExecutor,
  tokens,
  amounts,
  outcomeIndexes,
}: RedeemProps) {
  const approveCalls = tokens.map((token, index) => ({
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [gnosisRouterAddress, amounts[index]],
    }),
  }));

  const redeemCall = {
    to: gnosisRouterAddress,
    data: encodeFunctionData({
      abi: gnosisRouterAbi,
      functionName: "redeemPositions",
      args: [
        collateral.address,
        RISK_PRICING_MARKET_ID,
        outcomeIndexes,
        amounts,
      ],
    }),
  };

  // the router pulls the outcome tokens from the trade executor,
  // so approvals must run before the redeem call
  const calls = [...approveCalls, redeemCall];

  const writePromise = writeContract(config, {
    address: tradeExecutor,
    abi: TradeExecutorAbi,
    functionName: "batchExecute",
    args: [calls],
    value: 0n,
    chainId: DEFAULT_CHAIN.id,
  });

  const result = await waitForTransaction(() => writePromise);
  if (!result.status) {
    throw result.error;
  }
  return result;
}

/**
 *
 * @returns Redeems the risk pricing outcome tokens directly to collateral (sDAI)
 */
export const useRedeemRiskToTradeExecutor = (onSuccess?: () => unknown) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (props: RedeemProps) => redeemRiskToTradeExecutor(props),
    onSuccess() {
      onSuccess?.();
      queryClient.refetchQueries({ queryKey: ["useTokenBalance"] });
      queryClient.refetchQueries({ queryKey: ["useTokensBalances"] });
    },
  });
};
