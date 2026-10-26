import React, { FormEvent, useMemo, useState } from "react";

import { Form, Modal } from "@kleros/ui-components-library";
import { Address } from "viem";
import { useAccount } from "wagmi";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import { useTradeExecutorRiskMarketMerge } from "@/hooks/tradeWallet/useTradeExecutorRiskMarketMerge";
import { useTokensBalances } from "@/hooks/useTokenBalances";

import LightButton from "@/components/LightButton";
import TradeAmountField, { TradeCta } from "@/components/TradeAmountField";

import CloseIcon from "@/assets/svg/close-icon.svg";

import { isUndefined } from "@/utils";

import { collateral } from "@/consts";

interface MergeInterfaceProps {
  isOpen: boolean;
  toggleIsOpen: () => void;
  tradeExecutor: Address;
}

const MergeInterface: React.FC<MergeInterfaceProps> = ({
  tradeExecutor,
  isOpen,
  toggleIsOpen,
}) => {
  const [amount, setAmount] = useState<bigint>();

  const { address: account } = useAccount();
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const { data: outcomeBalances, isLoading: isBalanceLoading } =
    useTokensBalances(
      tradeExecutor,
      outcomes.map(({ outcomeId }) => outcomeId),
    );

  const minMarketBalance = useMemo<bigint>(() => {
    if (!isUndefined(outcomeBalances)) {
      if (outcomeBalances.some((result) => typeof result !== "bigint"))
        return 0n;
      const minResult = outcomeBalances.reduce((acc, curr) =>
        curr! < acc! ? curr : acc,
      );
      return minResult as bigint;
    }
    return 0n;
  }, [outcomeBalances]);

  const tradeExecutorMerge = useTradeExecutorRiskMarketMerge(() => {
    setAmount(undefined);
    toggleIsOpen();
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !amount) return;

    tradeExecutorMerge.mutate({
      amount,
      tradeExecutor,
      outcomeIds: outcomes.map((outcome) => outcome.outcomeId),
    });
  };

  const exceedsBalance = !isUndefined(amount) && amount > minMarketBalance;

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
          <h2 className="panel-title">Merge Project tokens</h2>
          <p className="panel-sub">Merge Project tokens to your account</p>
        </div>
        <Form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <TradeAmountField
            label="Amount"
            quick="share"
            decimals={collateral.decimals}
            value={amount}
            onChange={setAmount}
            balance={isBalanceLoading ? undefined : minMarketBalance}
            unit="sDAI"
            isReadOnly={tradeExecutorMerge.isPending}
            error={exceedsBalance ? "Not enough balance" : undefined}
            token={<span className="io-token">sDAI</span>}
          />

          <TradeCta
            type="submit"
            text="Merge"
            className="w-full"
            isDisabled={
              isBalanceLoading ||
              minMarketBalance === 0n ||
              !amount ||
              exceedsBalance
            }
            isLoading={tradeExecutorMerge.isPending}
          />
        </Form>
      </div>
    </Modal>
  );
};

export default MergeInterface;
