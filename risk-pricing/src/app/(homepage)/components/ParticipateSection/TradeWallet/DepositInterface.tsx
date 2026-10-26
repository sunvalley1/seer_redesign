import React, { FormEvent, useState } from "react";

import { Form, Modal } from "@kleros/ui-components-library";
import { Address } from "viem";
import { useAccount, useBalance } from "wagmi";

import { useDepositToTradeExecutor } from "@/hooks/tradeWallet/useDepositToTradeExecutor";
import { useTokenBalance } from "@/hooks/useTokenBalance";

import AmountInput from "@/components/AmountInput";
import LightButton from "@/components/LightButton";
import { TradeCta } from "@/components/TradeAmountField";

import CloseIcon from "@/assets/svg/close-icon.svg";

import { isUndefined } from "@/utils";

import { collateral } from "@/consts";
import { TokenType } from "@/consts/tokens";

interface DepositInterfaceProps {
  isOpen: boolean;
  toggleIsOpen: () => void;
  tradeExecutor: Address;
}

export const DepositInterface: React.FC<DepositInterfaceProps> = ({
  tradeExecutor,
  isOpen,
  toggleIsOpen,
}) => {
  const [amount, setAmount] = useState<bigint>();
  const [selectedToken, setSelectedToken] = useState<TokenType>(TokenType.sDAI);

  const { address: account } = useAccount();

  const { data: balanceSDaiData, isLoading: isBalanceLoading } =
    useTokenBalance({
      address: account,
      token: collateral.address,
    });
  const { data: balanceXDai, refetch: refetchXDai } = useBalance({
    address: account,
  });

  const depositToTradeExecutor = useDepositToTradeExecutor(() => {
    toggleIsOpen();
    setAmount(undefined);
    refetchXDai();
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isUndefined(amount)) return;

    depositToTradeExecutor.mutate({
      token: collateral.address,
      amount,
      tradeExecutor,
      isXDai: selectedToken === TokenType.xDAI,
    });
  };

  const balance =
    selectedToken === TokenType.sDAI
      ? balanceSDaiData?.value
      : balanceXDai?.value;
  const exceedsBalance =
    !isUndefined(amount) && !isUndefined(balance) && amount > balance;

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
          <h2 className="panel-title">Deposit</h2>
          <p className="panel-sub">Deposit from your account to trade wallet</p>
        </div>
        <Form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <AmountInput
            {...{ setSelectedToken, setAmount, selectedToken }}
            value={amount}
            balance={balance}
            isReadOnly={depositToTradeExecutor.isPending}
          />

          <TradeCta
            type="submit"
            text="Deposit"
            className="w-full"
            isDisabled={isBalanceLoading || !amount || exceedsBalance}
            isLoading={depositToTradeExecutor.isPending}
          />
        </Form>
      </div>
    </Modal>
  );
};
