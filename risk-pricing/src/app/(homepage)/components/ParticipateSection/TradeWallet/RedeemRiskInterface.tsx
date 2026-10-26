import React, { useMemo } from "react";

import { Modal } from "@kleros/ui-components-library";
import { Address, formatUnits } from "viem";

import { useRedeemRiskToTradeExecutor } from "@/hooks/tradeWallet/useRedeemRiskToTradeExecutor";
import { useRawMarketData } from "@/hooks/useMarketData";
import { useRiskMarketResolution } from "@/hooks/useRiskMarketResolution";
import { useTokensBalances } from "@/hooks/useTokenBalances";

import LightButton from "@/components/LightButton";
import { TradeCta } from "@/components/TradeAmountField";

import CloseIcon from "@/assets/svg/close-icon.svg";

import { isUndefined } from "@/utils";

interface RedeemRiskInterfaceProps {
  isOpen: boolean;
  toggleIsOpen: () => void;
  tradeExecutor: Address;
}

export const RedeemRiskInterface: React.FC<RedeemRiskInterfaceProps> = ({
  tradeExecutor,
  isOpen,
  toggleIsOpen,
}) => {
  const { data } = useRawMarketData();
  const wrappedTokens = data?.marketData?.wrappedTokens;

  const {
    isResolved,
    payoutFractions,
    isLoading: isLoadingResolution,
  } = useRiskMarketResolution();

  const { data: balances, isLoading: balancesLoading } = useTokensBalances(
    tradeExecutor,
    wrappedTokens,
  );

  // redeem only the winning outcome tokens held: losers pay out 0, so there
  // is no point spending an extra approval + gas to burn them
  const positionsToRedeem = useMemo(() => {
    if (
      isUndefined(wrappedTokens) ||
      isUndefined(balances) ||
      isUndefined(payoutFractions)
    )
      return undefined;
    return wrappedTokens
      .map((token, index) => ({
        token,
        index,
        balance: balances[index] ?? 0n,
      }))
      .filter(
        ({ balance, index }) =>
          balance > 0n && (payoutFractions[index] ?? 0) > 0,
      );
  }, [wrappedTokens, balances, payoutFractions]);

  const isCheckingStatus =
    isLoadingResolution || balancesLoading || isUndefined(positionsToRedeem);

  const isRedeemable =
    !isCheckingStatus && isResolved && positionsToRedeem.length > 0;

  // value of the held tokens based on the reported payouts (in sDAI)
  const totalValue = useMemo(() => {
    if (isUndefined(positionsToRedeem) || isUndefined(payoutFractions)) return;
    const total = positionsToRedeem.reduce(
      (acc, { balance, index }) =>
        acc +
        parseFloat(formatUnits(balance, 18)) * (payoutFractions[index] ?? 0),
      0,
    );
    if (total === 0) return "0.00";
    return total < 0.01 ? "<0.01" : total.toFixed(2);
  }, [positionsToRedeem, payoutFractions]);

  const redeemRiskFromTradeExecutor = useRedeemRiskToTradeExecutor(() => {
    toggleIsOpen();
  });

  const handleRedeem = () => {
    if (isUndefined(positionsToRedeem)) return;

    redeemRiskFromTradeExecutor.mutate({
      tradeExecutor,
      tokens: positionsToRedeem.map(({ token }) => token),
      outcomeIndexes: positionsToRedeem.map(({ index }) => BigInt(index)),
      amounts: positionsToRedeem.map(({ balance }) => balance),
    });
  };

  const statusMessage = isCheckingStatus
    ? "Checking redemptions..."
    : !isResolved
      ? "The market is not resolved yet."
      : isRedeemable
        ? `You can redeem your outcome tokens for up to ${totalValue ?? "0.00"} sDAI.`
        : "Nothing to redeem.";

  return (
    <Modal
      className="relative h-fit w-[440px] max-w-[calc(100vw-32px)] overflow-x-hidden p-6 pt-8"
      onOpenChange={toggleIsOpen}
      {...{ isOpen }}
    >
      <LightButton
        className="absolute top-4 right-4 p-1"
        ariaLabel="Close"
        text=""
        icon={
          <CloseIcon className="[&_path]:stroke-klerosUIComponentsSecondaryText size-4" />
        }
        onPress={toggleIsOpen}
      />

      <div className="flex size-full flex-col gap-6">
        <div className="flex w-full flex-col items-center gap-1.5">
          <h2 className="panel-title">Redeem Tokens</h2>
          <p className="panel-sub">{statusMessage}</p>
        </div>

        <TradeCta
          text="Redeem"
          className="w-full"
          isDisabled={isCheckingStatus || !isRedeemable}
          isLoading={redeemRiskFromTradeExecutor.isPending}
          onClick={handleRedeem}
        />
      </div>
    </Modal>
  );
};
