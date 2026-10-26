import * as React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { formatUnits, isAddressEqual, zeroAddress } from 'viem';
import type { Market, Token } from '@seer-pm/sdk';
import {
  TradeType,
  isTradingCredits,
  getMaximumAmountIn,
  WRAPPED_OUTCOME_TOKEN_DECIMALS,
  getActiveCollateralProfile,
  getActiveCreditsTokenAddress,
  getActiveCreditsManagerAddress,
  getActiveCreditsSymbol,
  getTradeTokenIn,
  hasTradingCredits,
  countCompleteSetBatches,
  type MintToCoverStatus,
} from '@seer-pm/sdk';
import {
  useCheck7702Support,
  useMarket,
  useMarketHasLiquidity,
  useParentMarkets,
  useQuoteTrade,
  useTokenBalance,
  useTokenInfo,
  useTrade,
  useApproveTokens,
} from '@seer-pm/react';
import { ConnectKitButton } from 'connectkit';
import { useMintToCover } from '../hooks/useMintToCover';
import { useSmartWalletPreference } from '../hooks/useSmartWalletPreference';
import type { ChainedMarketData } from '../lib/chainedMarket';
import { toastifyTx } from '../lib/toastify';
import { TokensDropdown } from './TokensDropdown';
import { TradeNotice } from './TradeNotice';
import { SmartWalletSwitch } from './SmartWalletSwitch';

const QUICK_AMOUNTS = [1, 5, 10] as const;
const QUICK_PERCENTS = [1, 5, 10] as const;

export interface SwapWidgetProps {
  readonly market: Market;
  /** Set when `market` flattens chained markets (root → child → …). */
  readonly chained?: ChainedMarketData;
  readonly outcomeIndex: number;
  readonly onOutcomeIndexChange: (index: number) => void;
  readonly requestedMode?: TradeModeRequest;
}

export interface TradeModeRequest {
  readonly mode: 'buy' | 'sell';
  readonly nonce: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function buildOutcomeTokens(market: Market): Token[] {
  const tokens: Token[] = [];
  const wrapped = market.wrappedTokens ?? [];
  const rawOutcomes = market.outcomes ?? [];

  for (let i = 0; i < wrapped.length; i += 1) {
    const address = wrapped[i];
    if (!address) continue;

    const raw = rawOutcomes[i];
    const symbol =
      typeof raw === 'string' ? raw : `Outcome ${i + 1}`;

    tokens.push({
      address: address as `0x${string}`,
      chainId: market.chainId,
      symbol,
      decimals: WRAPPED_OUTCOME_TOKEN_DECIMALS,
    });
  }

  return tokens;
}

function getCollateralOptions(
  market: Market,
  mode: 'buy' | 'sell',
  parentCollateral?: Token
): Token[] {
  const parentId = market.parentMarket.id;
  const hasParent =
    typeof parentId === 'string' &&
    !isAddressEqual(parentId, zeroAddress) &&
    parentCollateral;

  if (hasParent && parentCollateral) {
    return [parentCollateral];
  }

  const profile = getActiveCollateralProfile(market.chainId);
  const options: Token[] = [profile.primary];

  if (profile.secondary) {
    options.push(profile.secondary);
  }

  if (profile.secondary?.wrapped) {
    options.push(profile.secondary.wrapped);
  }

  if (profile.swap) {
    options.push(...profile.swap);
  }

  // Trading credits can only be used when buying (pay with credits), not as receive collateral
  if (mode === 'buy' && hasTradingCredits(market.chainId)) {
    const creditsAddress = getActiveCreditsTokenAddress(market.chainId);
    if (creditsAddress) {
      options.push({
        address: creditsAddress,
        chainId: market.chainId,
        symbol: getActiveCreditsSymbol(),
        decimals: 18,
      });
    }
  }

  return options;
}

function formatShares(value: bigint): string {
  return Number(
    formatUnits(value, WRAPPED_OUTCOME_TOKEN_DECIMALS)
  ).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

interface MintToCoverNoticeProps {
  status: MintToCoverStatus;
  collateralSymbol: string;
  outcomeBalance: bigint;
  supports7702: boolean;
}

/**
 * Explains a sell bigger than the shares held: the shortfall is minted as a
 * full set and the other outcomes stay in the wallet, so the user is short
 * the outcome they sell.
 */
function MintToCoverNotice({
  status,
  collateralSymbol,
  outcomeBalance,
  supports7702,
}: MintToCoverNoticeProps) {
  if (status.kind === 'insufficientCollateral') {
    return (
      <TradeNotice title="Insufficient balance" className="mb-5">
        You don't hold enough shares to sell that much. Add{' '}
        {formatShares(status.splitAmount - status.collateralBalance)}{' '}
        {collateralSymbol} and we can mint the difference for you.
      </TradeNotice>
    );
  }
  if (status.kind === 'splitTooLarge') {
    return (
      <TradeNotice title="Insufficient balance" className="mb-5">
        You don't hold enough shares to sell that much, and{' '}
        {status.isParent ? 'a parent market' : 'this market'} has{' '}
        {status.outcomeCount} outcomes, more than the{' '}
        {status.maxOutcomeCount} a single transaction can mint. Sell what you
        hold, or buy first.
      </TradeNotice>
    );
  }
  if (status.kind !== 'ready' || !status.quote.completeSetLeg) return null;

  const leg = status.quote.completeSetLeg;
  const splitAmount = leg.splitAmount ?? 0n;
  const batches = supports7702 ? countCompleteSetBatches(leg) : 0;
  const risk = !supports7702
    ? ' This runs as separate transactions; if the sell fails you keep the minted set.'
    : batches > 1
      ? ` This runs as ${batches} transactions; if one fails after the first you keep the sets already minted.`
      : '';

  return (
    <TradeNotice tone="info" title="We'll mint the rest" className="mb-5">
      You hold {formatShares(outcomeBalance)} shares.{' '}
      {formatShares(splitAmount)} {collateralSymbol} will be minted into a
      full set so you can sell {formatShares(leg.swapInputAmount ?? 0n)}, and
      you'll keep {formatShares(splitAmount)} of each other outcome.
      {risk}
    </TradeNotice>
  );
}

export function SwapWidget({
  market,
  chained,
  outcomeIndex,
  onOutcomeIndexChange,
  requestedMode,
}: SwapWidgetProps): React.ReactElement {
  const { address: account, chainId: connectedChainId } = useAccount();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const isWrongChain =
    account != null &&
    connectedChainId != null &&
    connectedChainId !== market.chainId;
  const lastAutoSwitchChainIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!account || connectedChainId == null) return;
    if (connectedChainId === market.chainId) return;
    if (lastAutoSwitchChainIdRef.current === market.chainId) return;
    lastAutoSwitchChainIdRef.current = market.chainId;
    switchChain({ chainId: market.chainId });
  }, [account, connectedChainId, market.chainId, switchChain]);

  const [mode, setMode] = React.useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = React.useState('');
  const [collateralAddress, setCollateralAddress] = React.useState<
    string | null
  >(null);

  const outcomeTokens = React.useMemo(
    () => buildOutcomeTokens(market),
    [market]
  );

  const parentId = market.parentMarket.id;
  const isChildMarket =
    typeof parentId === 'string' &&
    !isAddressEqual(parentId, zeroAddress);

  const parentOutcomeIndex = isChildMarket
    ? Number(market.parentOutcome)
    : undefined;

  const { data: parentMarket } = useMarket(
    market.parentMarket.id,
    market.chainId
  );

  const parentCollateralAddress =
    isChildMarket && parentMarket && parentOutcomeIndex !== undefined
      ? parentMarket.wrappedTokens?.[parentOutcomeIndex]
      : undefined;

  const { data: parentCollateral } = useTokenInfo(
    parentCollateralAddress,
    market.chainId
  );

  const collateralOptions = React.useMemo(
    () => getCollateralOptions(market, mode, parentCollateral),
    [market, mode, parentCollateral]
  );

  const selectedCollateral = React.useMemo(() => {
    if (collateralOptions.length === 0) {
      return getActiveCollateralProfile(market.chainId).primary;
    }
    if (collateralAddress) {
      const match = collateralOptions.find((token) =>
        isAddressEqual(
          token.address,
          collateralAddress as `0x${string}`
        )
      );
      if (match) return match;
    }
    return collateralOptions[0];
  }, [collateralOptions, collateralAddress, market.chainId]);

  React.useEffect(() => {
    setCollateralAddress(null);
    setAmount('');
  }, [market.id, market.chainId]);

  // Drop trading credits (and any other mode-gated token) when leaving buy mode
  React.useEffect(() => {
    if (!collateralAddress) return;
    const stillValid = collateralOptions.some((token) =>
      isAddressEqual(token.address, collateralAddress as `0x${string}`)
    );
    if (!stillValid) {
      setCollateralAddress(null);
    }
  }, [collateralOptions, collateralAddress]);

  const canChooseCollateral = collateralOptions.length > 1;

  const debouncedAmount = useDebounce(amount, 500);

  const safeOutcomeIndex =
    outcomeTokens.length === 0
      ? 0
      : Math.min(Math.max(outcomeIndex, 0), outcomeTokens.length - 1);

  const outcomeToken =
    outcomeTokens[safeOutcomeIndex] ?? outcomeTokens[0];

  const hasLiquidity = useMarketHasLiquidity(market, safeOutcomeIndex);

  const amountForQuote =
    isAddressEqual(selectedCollateral.address, outcomeToken.address)
      ? ''
      : debouncedAmount;

  const sellToken = mode === 'buy' ? selectedCollateral : outcomeToken;

  const { data: balance = 0n } = useTokenBalance(
    account,
    sellToken?.address,
    market.chainId
  );

  const {
    data: quoteData,
    isLoading: quoteIsLoading,
    error: quoteError,
  } = useQuoteTrade(
    market.chainId,
    account,
    amountForQuote,
    outcomeToken,
    selectedCollateral,
    mode,
    TradeType.EXACT_INPUT,
    '1',
    market,
    safeOutcomeIndex
  );

  const requiredAmount = quoteData?.trade
    ? getMaximumAmountIn(quoteData.trade)
    : 0n;

  const { data: parentMarkets } = useParentMarkets(market);

  // A flattened chained market is not on-chain: minting has to split the real
  // level that holds the outcome, through every level above it from the root.
  const mintTarget = React.useMemo(() => {
    const row = chained?.rows[safeOutcomeIndex];
    const level = row ? chained?.levels[row.level] : undefined;
    if (!chained || !row || !level) {
      return { market, parentMarkets, outcomeIndex: safeOutcomeIndex };
    }
    return {
      market: level,
      parentMarkets: chained.levels.slice(0, row.level),
      outcomeIndex: row.outcomeIndex,
    };
  }, [chained, market, parentMarkets, safeOutcomeIndex]);

  // In sell mode `balance` is the outcome's, so the collateral needs its own.
  const { data: collateralBalance = 0n } = useTokenBalance(
    account,
    mode === 'sell' ? selectedCollateral.address : undefined,
    market.chainId
  );

  const mintToCover = useMintToCover({
    market: mintTarget.market,
    parentMarkets: mintTarget.parentMarkets,
    outcomeIndex: mintTarget.outcomeIndex,
    selectedCollateral,
    swapType: mode,
    account,
    amount: amountForQuote,
    outcomeBalance: balance,
    collateralBalance,
    quoteData,
  });
  const isMintToCover = mintToCover.kind === 'ready';
  const mintToCoverBlocked =
    mintToCover.kind === 'insufficientCollateral' ||
    mintToCover.kind === 'splitTooLarge';

  // Everything downstream of the quote (approvals, execution) must see the
  // composite mint + sell route, not the plain sell it was derived from.
  const effectiveQuote =
    mintToCover.kind === 'ready' ? mintToCover.quote : quoteData;
  const completeSetLeg = effectiveQuote?.completeSetLeg;

  const insufficientBalance =
    !!quoteData?.trade &&
    requiredAmount > 0n &&
    balance < requiredAmount &&
    mintToCover.kind === 'off';

  const isTradingCreditsCollateral = selectedCollateral
    ? isTradingCredits(market.chainId, selectedCollateral.address)
    : false;

  // Credits trades are funded by the credits manager's own collateral balance,
  // so the swap reverts if the manager can't cover the trade's input amount.
  const creditsManagerAddress = isTradingCreditsCollateral
    ? getActiveCreditsManagerAddress(market.chainId)
    : undefined;
  const tradeTokenIn = quoteData?.trade
    ? getTradeTokenIn(quoteData.trade)
    : undefined;

  const { data: creditsManagerBalance } = useTokenBalance(
    creditsManagerAddress,
    tradeTokenIn?.address as `0x${string}` | undefined,
    market.chainId
  );

  const insufficientCreditsLiquidity =
    isTradingCreditsCollateral &&
    !!quoteData?.trade &&
    requiredAmount > 0n &&
    creditsManagerBalance !== undefined &&
    creditsManagerBalance < requiredAmount;

  const creditsAvailable =
    creditsManagerBalance !== undefined && tradeTokenIn
      ? Number(formatUnits(creditsManagerBalance, tradeTokenIn.decimals))
      : 0;

  const creditsAvailableDisplay = (
    Math.floor(creditsAvailable * 100) / 100
  ).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [useSmartWallet, setUseSmartWallet] = useSmartWalletPreference();
  const walletSupports7702 = useCheck7702Support(true);
  const supports7702 = walletSupports7702 && useSmartWallet;

  // With a smart wallet the approvals ride inside the batch, so `approvals`
  // comes back empty; credits trades need none either.
  const {
    tradeTokens,
    approvals: { data: missingApprovals = [], isLoading: isApprovalLoading },
  } = useTrade(
    account,
    effectiveQuote?.trade,
    isTradingCreditsCollateral,
    () => {
      setAmount('');
    },
    supports7702,
    toastifyTx,
    market,
    effectiveQuote?.psm3Leg,
    completeSetLeg
  );

  const needsTokenApproval =
    !isTradingCreditsCollateral && missingApprovals.length > 0;

  const approveTokensMutation = useApproveTokens(toastifyTx);

  const executeTrade = tradeTokens.mutateAsync;
  const isTradePending = tradeTokens.isPending;

  const receivedAmount = quoteData
    ? Number(formatUnits(quoteData.value, quoteData.decimals))
    : 0;

  const isDisabled = hasLiquidity === false;

  const outcomeOptions: readonly Token[] = React.useMemo(
    () => outcomeTokens,
    [outcomeTokens]
  );

  const { data: outcomeShares = 0n } = useTokenBalance(
    account,
    outcomeToken?.address,
    market.chainId
  );

  const payBalanceRaw = mode === 'buy' ? balance : outcomeShares;

  const payDecimals =
    mode === 'buy'
      ? selectedCollateral?.decimals ?? 18
      : WRAPPED_OUTCOME_TOKEN_DECIMALS;

  const payBalanceHuman = Number(formatUnits(payBalanceRaw, payDecimals));

  const setAmountToPercent = React.useCallback(
    (pct: number) => {
      const value = (payBalanceHuman * pct) / 100;
      setAmount(value <= 0 ? '0' : value.toFixed(4).replace(/\.?0+$/, ''));
    },
    [payBalanceHuman]
  );

  const addPercentOfBalance = React.useCallback(
    (pct: number) => {
      setAmount((prev) => {
        const next = (Number(prev) || 0) + (payBalanceHuman * pct) / 100;
        return next <= 0 ? '' : String(Number(next.toFixed(4)));
      });
    },
    [payBalanceHuman]
  );

  const [swapRotation, setSwapRotation] = React.useState(0);

  const addBuyAmount = React.useCallback((delta: number) => {
    setAmount((prev) => {
      const next = (Number(prev) || 0) + delta;
      return next <= 0 ? '' : String(next);
    });
  }, []);

  const setTradeMode = React.useCallback((next: 'buy' | 'sell') => {
    setMode(next);
  }, []);

  React.useEffect(() => {
    if (requestedMode) setTradeMode(requestedMode.mode);
  }, [requestedMode, setTradeMode]);

  const selectCollateral = React.useCallback((token: Token) => {
    setCollateralAddress(token.address);
  }, []);

  const payBalance =
    mode === 'buy'
      ? account
        ? Number(
            formatUnits(balance, selectedCollateral?.decimals ?? 18)
          ).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : '0.00'
      : account
        ? Number(
            formatUnits(outcomeShares, WRAPPED_OUTCOME_TOKEN_DECIMALS)
          ).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })
        : '0.00';

  const displayReceiveAmount =
    quoteData && Number(debouncedAmount) > 0 && !quoteIsLoading
      ? receivedAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
      : '0.0';

  const amountIn = Number(debouncedAmount) || 0;
  const amountOut = receivedAmount;

  const avgPrice =
    quoteData && amountIn > 0 && amountOut > 0 && !quoteIsLoading
      ? mode === 'buy'
        ? amountIn / amountOut
        : amountOut / amountIn
      : null;

  const avgPriceDisplay =
    avgPrice != null
      ? `${avgPrice.toFixed(4)} ${selectedCollateral?.symbol ?? ''}`
      : '—';

  const mapTokenToIndex = React.useCallback(
    (token: Token): number => {
      const addr = token.address.toLowerCase();
      const idx = outcomeTokens.findIndex(
        (t) => t.address.toLowerCase() === addr
      );
      return idx >= 0 ? idx : 0;
    },
    [outcomeTokens]
  );

  const handleSelectOutcome = React.useCallback(
    (token: Token) => {
      onOutcomeIndexChange(mapTokenToIndex(token));
    },
    [mapTokenToIndex, onOutcomeIndexChange]
  );

  const handleApprove = React.useCallback(async () => {
    if (!missingApprovals[0]) return;
    const a = missingApprovals[0];
    await approveTokensMutation.mutateAsync({
      tokenAddress: a.address,
      spender: a.spender,
      amount: a.amount,
      chainId: market.chainId,
    });
  }, [approveTokensMutation, missingApprovals, market.chainId]);

  const canSubmit =
    !isDisabled &&
    !insufficientBalance &&
    !mintToCoverBlocked &&
    !insufficientCreditsLiquidity &&
    !isTradePending &&
    !!account &&
    !!quoteData?.trade &&
    !isApprovalLoading;

  const handleSwitchNetwork = React.useCallback(
    () => switchChain({ chainId: market.chainId }),
    [switchChain, market.chainId]
  );

  const sellTokenSymbol = sellToken?.symbol ?? undefined;
  const collateralSymbol = selectedCollateral?.symbol ?? 'sDAI';

  const onFormSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !account ||
        !effectiveQuote?.trade ||
        insufficientBalance ||
        mintToCoverBlocked ||
        insufficientCreditsLiquidity ||
        isTradePending
      )
        return;
      try {
        // The mutation executes the props it receives, so the legs must ride
        // along or a PSM3 / mint + sell route would run as a plain swap.
        await executeTrade({
          trade: effectiveQuote.trade,
          account,
          isTradingCredits: isTradingCreditsCollateral,
          psm3Leg: effectiveQuote.psm3Leg,
          completeSetLeg: effectiveQuote.completeSetLeg,
        });
      } catch (err) {
        console.error('Trade failed:', err);
      }
    },
    [
      account,
      effectiveQuote,
      insufficientBalance,
      mintToCoverBlocked,
      insufficientCreditsLiquidity,
      isTradePending,
      executeTrade,
      isTradingCreditsCollateral,
    ]
  );

  const submitLabel = (() => {
    if (isTradePending) return 'Executing…';
    if (!account) return 'Connect wallet to trade';
    if (isDisabled) return 'No liquidity';
    if (!amount || Number(amount) <= 0) return 'Enter an amount';
    if (quoteIsLoading) return 'Getting quote…';
    if (quoteError) return 'Quote unavailable';
    if (insufficientBalance || mintToCoverBlocked) return 'Insufficient balance';
    if (insufficientCreditsLiquidity) return 'Credits unavailable';
    if (!quoteData?.trade) return 'Enter an amount';
    if (isMintToCover) return 'Mint & Sell';
    return 'Place Trade';
  })();

  const amountHasProblem =
    !isDisabled &&
    (insufficientBalance ||
      mintToCoverBlocked ||
      insufficientCreditsLiquidity ||
      (!!quoteError && Number(amount) > 0));

  const payUnit = mode === 'buy' ? collateralSymbol : 'shares';
  const primarySymbol = getActiveCollateralProfile(market.chainId).primary.symbol;
  const hasQuoteAmount =
    !!quoteData && Number(debouncedAmount) > 0 && !quoteIsLoading;
  const canUseBalance = !!account && payBalanceHuman > 0 && !isDisabled;

  const outcomePill = outcomeToken ? (
    <TokensDropdown
      layout="pill"
      options={outcomeOptions}
      value={outcomeToken}
      onSelect={handleSelectOutcome}
    />
  ) : (
    <span className="io-token">No outcomes</span>
  );

  const collateralPill = canChooseCollateral ? (
    <TokensDropdown
      layout="pill"
      options={collateralOptions}
      value={selectedCollateral}
      onSelect={selectCollateral}
    />
  ) : (
    <span className="io-token">{collateralSymbol}</span>
  );

  return (
    <div className={`lot-panel overflow-hidden ${isDisabled ? 'opacity-90' : ''}`}>
      <div className="purchase-tabs" role="group" aria-label="Trade mode">
        <button
          type="button"
          aria-pressed={mode === 'buy'}
          onClick={() => setTradeMode('buy')}
          className={`purchase-tab ${mode === 'buy' ? 'active' : ''}`}
        >
          Buy
        </button>
        <button
          type="button"
          aria-pressed={mode === 'sell'}
          onClick={() => setTradeMode('sell')}
          className={`purchase-tab ${mode === 'sell' ? 'active' : ''}`}
        >
          Sell
        </button>
      </div>

      <div className="px-5 py-[18px]">
        {isDisabled && (
          <TradeNotice title="No liquidity" className="mb-5">
            This outcome lacks enough liquidity to trade right now.
          </TradeNotice>
        )}
        {insufficientBalance && !isDisabled && (
          <TradeNotice title="Insufficient balance" className="mb-5">
            You need more {sellTokenSymbol ?? 'tokens'} to complete this trade.
          </TradeNotice>
        )}
        {!isDisabled && (
          <MintToCoverNotice
            status={mintToCover}
            collateralSymbol={collateralSymbol}
            outcomeBalance={balance}
            supports7702={supports7702}
          />
        )}
        {insufficientCreditsLiquidity && !isDisabled && !insufficientBalance && (
          <TradeNotice title="Credits unavailable" className="mb-5">
            {creditsAvailable < 0.01
              ? "Credits can't be used right now: there aren't enough funds backing them. Pay with another token."
              : `Credits can cover up to ${creditsAvailableDisplay} ${collateralSymbol} right now. Lower the amount or pay with another token.`}
          </TradeNotice>
        )}

        <form className="space-y-5" onSubmit={onFormSubmit}>
          <div>
            <div className="io-block">
              <div className="io-label">
                <label htmlFor="trade-amount">You pay</label>
                <span className="tabular-nums">
                  Balance: {payBalance} {payUnit}
                </span>
              </div>
              <div
                className={`io-row ${amountHasProblem ? 'is-error' : ''} ${
                  isDisabled ? 'opacity-60' : ''
                }`}
              >
                <input
                  id="trade-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  step="any"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isDisabled}
                />
                {mode === 'buy' ? collateralPill : outcomePill}
              </div>
              <div className="io-balance">
                <span />
                <div className="quick-group">
                  <button
                    type="button"
                    className="quick-btn quick-btn--full"
                    onClick={() => setAmountToPercent(50)}
                    disabled={!canUseBalance}
                  >
                    HALF
                  </button>
                  <button
                    type="button"
                    className="quick-btn quick-btn--full"
                    onClick={() => setAmountToPercent(100)}
                    disabled={!canUseBalance}
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="io-quick-actions">
                <div className="quick-group">
                  {QUICK_AMOUNTS.map((n) => (
                    <button
                      key={`amount-${n}`}
                      type="button"
                      className="quick-btn quick-btn--dollar"
                      onClick={() => addBuyAmount(n)}
                      disabled={isDisabled}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
                <div className="quick-group">
                  {QUICK_PERCENTS.map((pct) => (
                    <button
                      key={`pct-${pct}`}
                      type="button"
                      className="quick-btn quick-btn--pct"
                      onClick={() => addPercentOfBalance(pct)}
                      disabled={!canUseBalance}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="io-swap-wrap">
              <button
                type="button"
                aria-label={mode === 'buy' ? 'Switch to sell' : 'Switch to buy'}
                className="io-swap"
                onClick={() => {
                  setTradeMode(mode === 'buy' ? 'sell' : 'buy');
                  setSwapRotation((r) => r + 180);
                }}
              >
                <svg
                  className="io-swap-icon"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                  style={{ transform: `rotate(${swapRotation}deg)` }}
                >
                  <path
                    d="M5.25 13.5V4.5M5.25 4.5L2.5 7.25M5.25 4.5L8 7.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.75 4.5V13.5M12.75 13.5L10 10.75M12.75 13.5L15.5 10.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div>
              <div className="io-label">
                <span>You will get</span>
                <span>≈</span>
              </div>
              <div className="io-row">
                <span className={`io-value ${hasQuoteAmount ? '' : 'is-empty'}`}>
                  {quoteIsLoading && Number(amount) > 0
                    ? '…'
                    : hasQuoteAmount
                      ? displayReceiveAmount
                      : '0'}
                </span>
                {mode === 'buy' ? outcomePill : collateralPill}
              </div>
            </div>
          </div>

          {quoteError && Number(amount) > 0 && (
            <TradeNotice
              title={
                quoteError.message === 'No route found'
                  ? 'Not enough liquidity'
                  : 'Quote unavailable'
              }
            >
              {quoteError.message === 'No route found'
                ? 'Try a smaller amount.'
                : quoteError.message}
            </TradeNotice>
          )}

          <div>
            <div className="trade-summary">
              <div className="trade-summary-row">
                <span>Avg price</span>
                <span>{avgPriceDisplay}</span>
              </div>
              {isMintToCover && completeSetLeg?.leftoverTokens?.length ? (
                <div
                  className="trade-summary-row"
                  title={completeSetLeg.leftoverTokens
                    .map((l) => l.token.symbol)
                    .join(', ')}
                >
                  <span>You keep</span>
                  <span>
                    {formatShares(completeSetLeg.splitAmount ?? 0n)} of each other
                    outcome ({completeSetLeg.leftoverTokens.length})
                  </span>
                </div>
              ) : null}
            </div>
            {mode === 'buy' && !chained && outcomeToken ? (
              <p className="return-note">
                Each share can be redeemed for 1 {primarySymbol} if the market
                resolves to {outcomeToken.symbol}.
              </p>
            ) : null}
          </div>

          {account && walletSupports7702 ? (
            <SmartWalletSwitch
              enabled={useSmartWallet}
              onChange={setUseSmartWallet}
            />
          ) : null}

          <div className="slippage-row">
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="10" cy="17" r="2" />
              </svg>
              Max slippage 0.5%
            </span>
          </div>

          {!account ? (
            <ConnectKitButton.Custom>
              {({ show }: { show?: () => void }) => (
                <button
                  type="button"
                  onClick={() => show?.()}
                  className="trade-cta"
                >
                  Connect wallet to trade
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : isWrongChain ? (
            <button
              type="button"
              onClick={handleSwitchNetwork}
              disabled={isSwitchPending}
              className="trade-cta"
            >
              {isSwitchPending ? 'Switching…' : 'Change network'}
            </button>
          ) : !insufficientBalance && !mintToCoverBlocked && needsTokenApproval ? (
            <button
              type="button"
              onClick={() => {
                void handleApprove();
              }}
              disabled={approveTokensMutation.isPending || isApprovalLoading}
              className="trade-cta"
            >
              {approveTokensMutation.isPending || isApprovalLoading
                ? 'Approving…'
                : 'Approve'}
            </button>
          ) : (
            <button type="submit" disabled={!canSubmit} className="trade-cta">
              {submitLabel}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default SwapWidget;
