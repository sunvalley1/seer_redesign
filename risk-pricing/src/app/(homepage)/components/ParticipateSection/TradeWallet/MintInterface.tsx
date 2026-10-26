import React, { FormEvent, useState } from "react";

import { Form, Modal } from "@kleros/ui-components-library";
import { Address } from "viem";
import { useAccount } from "wagmi";

import { useTradeExecutorRiskMarketSplit } from "@/hooks/tradeWallet/useTradeExecutorRiskMarketSplit";
import { useTokenBalance } from "@/hooks/useTokenBalance";

import LightButton from "@/components/LightButton";
import TradeAmountField, { TradeCta } from "@/components/TradeAmountField";

import CloseIcon from "@/assets/svg/close-icon.svg";

import { isUndefined } from "@/utils";

import { collateral } from "@/consts";

interface MintInterfaceProps {
  isOpen: boolean;
  toggleIsOpen: () => void;
  tradeExecutor: Address;
}

const MintInterface: React.FC<MintInterfaceProps> = ({
  tradeExecutor,
  isOpen,
  toggleIsOpen,
}) => {
  const [amount, setAmount] = useState<bigint>();

  const { address: account } = useAccount();

  const { data: balanceData, isLoading: isBalanceLoading } = useTokenBalance({
    address: tradeExecutor,
    token: collateral.address,
  });
  const balance = balanceData?.value;
  const exceedsBalance =
    !isUndefined(amount) && !isUndefined(balance) && amount > balance;

  const tradeExecutorSplit = useTradeExecutorRiskMarketSplit(() => {
    setAmount(undefined);
    toggleIsOpen();
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account || !amount) return;

    tradeExecutorSplit.mutate({
      amount,
      tradeExecutor,
    });
  };

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
          <h2 className="panel-title">Mint Project tokens</h2>
          <p className="panel-sub">Mint Project tokens to your Trade wallet</p>
        </div>
        <Form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <TradeAmountField
            label="Amount"
            quick="share"
            decimals={collateral.decimals}
            value={amount}
            onChange={setAmount}
            balance={balance}
            unit="sDAI"
            isReadOnly={tradeExecutorSplit.isPending}
            error={exceedsBalance ? "Not enough balance" : undefined}
            token={<span className="io-token">sDAI</span>}
          />

          <TradeCta
            type="submit"
            text="Mint"
            className="w-full"
            isDisabled={
              isBalanceLoading || balance === 0n || !amount || exceedsBalance
            }
            isLoading={tradeExecutorSplit.isPending}
          />
        </Form>
      </div>
    </Modal>
  );
};

export default MintInterface;
