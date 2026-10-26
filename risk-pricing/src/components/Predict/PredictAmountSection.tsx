import React, { useMemo } from "react";

import { AlertMessage, Checkbox } from "@kleros/ui-components-library";
import clsx from "clsx";

import { formatValue, isUndefined } from "@/utils";

import { MIN_SEER_CREDITS_USAGE } from "@/consts";
import { TokenType } from "@/consts/tokens";

import AmountInput from "./AmountInput";

interface IPredictAmountSection {
  amount: bigint | undefined;
  setAmount: (value: bigint | undefined) => void;

  selectedToken: TokenType;
  setSelectedToken: (value: TokenType) => void;

  availableBalance: bigint;
  isSending: boolean;

  seerCreditsBalance: bigint;
  seerCreditsEquivalentXDAI: bigint;
  creditsFromWallet?: bigint;
  creditsFromEOA?: bigint;

  toBeAdded: bigint;
  sDAIDepositAmount?: bigint;

  isWalletCreated: boolean;
  isUsingSeerCredits: boolean;
  toggleIsUsingCredits: (value?: boolean) => void;
  isFirstPrediction: boolean;
}

export const PredictAmountSection: React.FC<IPredictAmountSection> = ({
  amount,
  setAmount,
  selectedToken,
  setSelectedToken,
  availableBalance,
  isSending,
  seerCreditsBalance,
  seerCreditsEquivalentXDAI,
  creditsFromWallet = 0n,
  creditsFromEOA = 0n,
  toBeAdded,
  sDAIDepositAmount,
  isWalletCreated,
  isUsingSeerCredits,
  toggleIsUsingCredits,
  isFirstPrediction,
}) => {
  const tradeWalletSDaiUsage = useMemo(() => {
    if (isUndefined(sDAIDepositAmount) || !isWalletCreated) return 0n;
    return (
      sDAIDepositAmount -
      toBeAdded -
      (isUsingSeerCredits ? creditsFromEOA + creditsFromWallet : 0n)
    );
  }, [
    sDAIDepositAmount,
    toBeAdded,
    isUsingSeerCredits,
    isWalletCreated,
    creditsFromEOA,
    creditsFromWallet,
  ]);

  const isXDAI = selectedToken === TokenType.xDAI;

  return (
    <div className="flex w-full flex-col gap-5">
      {isFirstPrediction ? null : (
        <AlertMessage
          title="Note"
          variant="info"
          msg={
            "Since you've already made a prediction, you can change it even without adding extra capital."
          }
          className={clsx(
            "[&_small]:text-sb-ink-3 rounded-lg border-none p-3 [&_small]:text-[12.5px]",
            "bg-sb-blue-soft",
          )}
        />
      )}
      <AmountInput
        {...{ setAmount, selectedToken, setSelectedToken, isFirstPrediction }}
        isUsingCredits={isUsingSeerCredits}
        balance={availableBalance}
        equivalentSDAI={sDAIDepositAmount}
        value={amount}
        isReadOnly={isSending}
      />

      {seerCreditsBalance > MIN_SEER_CREDITS_USAGE ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Checkbox
            small
            label={`Use your Foresight Credits. Available: ${formatValue(seerCreditsBalance)}
                      ${isXDAI ? `( ~${formatValue(seerCreditsEquivalentXDAI)} xdai )` : ""}`}
            onChange={toggleIsUsingCredits}
            defaultSelected={isUsingSeerCredits}
            className="text-sb-ink-3 w-fit pl-6 text-[12.5px] font-medium [&_div]:top-0 [&_div]:size-4 [&_svg]:size-4"
          />
          {isUsingSeerCredits ? (
            <button
              type="button"
              className="text-sb-blue hover:text-sb-ink cursor-pointer text-[12px] font-semibold"
              onClick={() => {
                setAmount(
                  isXDAI ? seerCreditsEquivalentXDAI : seerCreditsBalance,
                );
              }}
            >
              Use max credits
            </button>
          ) : null}
        </div>
      ) : null}

      {!isUndefined(amount) && amount > 0n ? (
        <div className="trade-summary">
          <div className="trade-summary-row">
            <span>Total</span>
            <span>{formatValue(sDAIDepositAmount ?? 0n)} sDAI</span>
          </div>
          {isUsingSeerCredits && creditsFromWallet > 0n ? (
            <div className="trade-summary-row">
              <span>Credits in trade wallet</span>
              <span>{formatValue(creditsFromWallet)}</span>
            </div>
          ) : null}
          {isUsingSeerCredits && creditsFromEOA > 0n ? (
            <div className="trade-summary-row">
              <span>Credits from your wallet</span>
              <span>{formatValue(creditsFromEOA)}</span>
            </div>
          ) : null}
          {tradeWalletSDaiUsage > 0n ? (
            <div className="trade-summary-row">
              <span>sDAI in trade wallet</span>
              <span>{formatValue(tradeWalletSDaiUsage)}</span>
            </div>
          ) : null}
          {toBeAdded > 0n ? (
            <div className="trade-summary-row">
              <span>From your wallet</span>
              <span>{formatValue(toBeAdded)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
