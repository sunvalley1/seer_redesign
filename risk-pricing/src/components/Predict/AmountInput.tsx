import { useMemo } from "react";

import { DropdownSelect } from "@kleros/ui-components-library";

import { formatValue, isUndefined } from "@/utils";

import { Tokens, TokenType } from "@/consts/tokens";

import TradeAmountField from "../TradeAmountField";

interface IPredictAmountInput {
  setAmount: (amount: bigint) => void;
  setSelectedToken: (token: TokenType) => void;
  value?: bigint;
  balance?: bigint;
  equivalentSDAI?: bigint;
  selectedToken: TokenType;
  className?: string;
  isReadOnly?: boolean;
  isFirstPrediction: boolean;
  isUsingCredits: boolean;
}

const PredictAmountInput: React.FC<IPredictAmountInput> = ({
  setAmount,
  selectedToken,
  setSelectedToken,
  value,
  balance,
  equivalentSDAI,
  className,
  isReadOnly,
  isFirstPrediction,
  isUsingCredits,
}) => {
  const notEnoughBalance = useMemo(
    () => !isUndefined(value) && !isUndefined(balance) && value > balance,
    [value, balance],
  );

  const SDAIIcon = Tokens[TokenType.sDAI].Icon;
  const items = [
    {
      text: "sDAI",
      itemValue: TokenType.sDAI,
      id: TokenType.sDAI,
      icon: <SDAIIcon className="mr-2 size-6" />,
    },
    {
      text: "xDAI",
      itemValue: TokenType.xDAI,
      id: TokenType.xDAI,
      icon: <SDAIIcon className="mr-2 size-6" />,
    },
  ];

  const isXDai = selectedToken === TokenType.xDAI;

  return (
    <TradeAmountField
      className={className}
      label={isFirstPrediction ? "You pay" : "Extra collateral"}
      value={value}
      onChange={setAmount}
      balance={balance}
      unit={isXDai ? "xDAI" : "sDAI"}
      balanceNote={isUsingCredits ? " + credits" : null}
      isReadOnly={isReadOnly}
      error={notEnoughBalance ? "Not enough balance" : undefined}
      hint={
        isXDai && value && value > 0n
          ? !isUndefined(equivalentSDAI)
            ? `≈ ${formatValue(equivalentSDAI)} sDAI`
            : "Loading…"
          : undefined
      }
      token={
        <DropdownSelect
          className="io-token-select"
          callback={(item) => {
            setSelectedToken(item.itemValue);
          }}
          defaultSelectedKey={selectedToken}
          items={items}
          isDisabled={isReadOnly}
        />
      }
    />
  );
};
export default PredictAmountInput;
