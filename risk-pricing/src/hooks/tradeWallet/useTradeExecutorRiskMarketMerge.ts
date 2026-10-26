import { useMutation, useQueryClient } from "@tanstack/react-query";
import { writeContract } from "@wagmi/core";
import { Address, encodeFunctionData, erc20Abi } from "viem";

import { TradeExecutorAbi } from "@/contracts/abis/TradeExecutorAbi";
import { gnosisRouterAbi, gnosisRouterAddress } from "@/generated";
import { config } from "@/wagmiConfig";

import { waitForTransaction } from "@/utils/waitForTransaction";

import { collateral, DEFAULT_CHAIN } from "@/consts";
import { RISK_PRICING_MARKET_ID } from "@/consts/markets";

interface MergeProps {
  tradeExecutor: Address;
  amount: bigint;
  outcomeIds: Address[];
}

async function mergeFromTradeExecutor({
  tradeExecutor,
  amount,
  outcomeIds,
}: MergeProps) {
  const approveCalls = outcomeIds.map((outcomeId) => ({
    to: outcomeId,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [gnosisRouterAddress, amount],
    }),
  }));

  const mergeCall = {
    to: gnosisRouterAddress,
    data: encodeFunctionData({
      abi: gnosisRouterAbi,
      functionName: "mergePositions",
      args: [collateral.address, RISK_PRICING_MARKET_ID, amount],
    }),
  };
  const calls = [...approveCalls, mergeCall];
  console.log({ calls });

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

export const useTradeExecutorRiskMarketMerge = (onSuccess?: () => unknown) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (props: MergeProps) => mergeFromTradeExecutor(props),
    onSuccess() {
      onSuccess?.();
      queryClient.refetchQueries({ queryKey: ["useTokenBalance"] });
      queryClient.refetchQueries({ queryKey: ["useTokensBalances"] });
    },
  });
};
