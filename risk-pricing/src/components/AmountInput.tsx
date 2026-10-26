import { useMemo } from "react";

import { DropdownSelect } from "@kleros/ui-components-library";

import { isUndefined } from "@/utils";

import { Tokens, TokenType } from "@/consts/tokens";

import TradeAmountField from "./TradeAmountField";

interface IAmountInput {
  setAmount: (amount: bigint) => void;
  setSelectedToken: (token: TokenType) => void;
  value?: bigint;
  balance?: bigint;
  selectedToken: TokenType;
  label?: string;
  className?: string;
  isReadOnly?: boolean;
  isWithdraw?: boolean;
}

const TOKEN_LABELS: Record<TokenType, string> = {
  [TokenType.sDAI]: "sDAI",
  [TokenType.xDAI]: "xDAI",
  [TokenType.WXDAI]: "wxDAI",
  [TokenType.SeerCredits]: "Credits",
};

const AmountInput: React.FC<IAmountInput> = ({
  setAmount,
  selectedToken,
  setSelectedToken,
  value,
  balance,
  label = "Amount",
  className,
  isReadOnly,
  isWithdraw,
}) => {
  const notEnoughBalance = useMemo(
    () => !isUndefined(value) && !isUndefined(balance) && value > balance,
    [value, balance],
  );

  const items = useMemo(() => {
    const SDAIIcon = Tokens[TokenType.sDAI].Icon;
    const SeerCreditsIcon = Tokens[TokenType.SeerCredits].Icon;
    const tokens = [
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
    if (isWithdraw) {
      tokens.push(
        ...[
          {
            text: "wxDAI",
            itemValue: TokenType.WXDAI,
            id: TokenType.WXDAI,
            icon: <SDAIIcon className="mr-2 size-6" />,
          },
          {
            text: "Foresight Credits",
            itemValue: TokenType.SeerCredits,
            id: TokenType.SeerCredits,
            icon: <SeerCreditsIcon className="mr-2 size-6" />,
          },
        ],
      );
    }
    return tokens;
  }, [isWithdraw]);

  return (
    <TradeAmountField
      className={className}
      label={label}
      quick="share"
      value={value}
      onChange={setAmount}
      balance={balance}
      unit={TOKEN_LABELS[selectedToken]}
      isReadOnly={isReadOnly}
      error={notEnoughBalance ? "Not enough balance" : undefined}
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
export default AmountInput;
