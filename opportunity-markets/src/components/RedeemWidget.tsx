import * as React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { formatUnits, isAddressEqual, zeroAddress, type Address } from 'viem';
import {
  MarketStatus,
  WRAPPED_OUTCOME_TOKEN_DECIMALS,
  getActiveCollateralProfile,
  getMarketStatus,
  getRedeemRouter,
  getRedeemedPrice,
  type Market,
  type MarketPosition,
  type WinningPositionsResult,
} from '@seer-pm/sdk';
import {
  useApproveTokens,
  useCheck7702Support,
  useMarketPositions,
  useRedeemPositions,
  useWinningPositions,
} from '@seer-pm/react';
import { ConnectKitButton } from 'connectkit';
import { getChainedLevels, getMarketOverride } from '../config/market';
import { useSmartWalletPreference } from '../hooks/useSmartWalletPreference';
import {
  flattenChainedRows,
  getChainedRedeemValue,
  type ChainedMarketData,
} from '../lib/chainedMarket';
import { toastifySendCallsTx, toastifyTx } from '../lib/toastify';
import { SmartWalletSwitch } from './SmartWalletSwitch';
import { TradeNotice } from './TradeNotice';
import { labelClass } from './tradeStyles';

export interface RedeemWidgetProps {
  readonly market: Market;
  /** Set when `market` flattens chained markets (root → child → …). */
  readonly chained?: ChainedMarketData;
}

/** A real on-chain market whose winning shares can be redeemed. */
interface RedeemTarget {
  market: Market;
  /** Display label per outcome index. */
  labels: string[];
  /** Base collateral one share is finally worth, per outcome index. */
  values: number[];
  /** Redeem through the ConditionalRouter straight to the base collateral. */
  toParentCollateral: boolean;
  /** Redeeming yields the parent level's "Other" shares, not collateral. */
  intoParentShares: boolean;
}

interface Winner {
  key: string;
  label: string;
  value: number;
}

type LevelStatus = 'loading' | 'none' | 'some';

function isChildMarket(market: Market): boolean {
  return !isAddressEqual(market.parentMarket.id, zeroAddress);
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatPerShare(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function buildTargets(market: Market, chained?: ChainedMarketData): RedeemTarget[] {
  const levelsConfig = getChainedLevels(market.id);
  if (!chained || !levelsConfig) {
    const parentPaid =
      market.parentMarket.payoutReported &&
      (market.parentMarket.payoutNumerators[Number(market.parentOutcome)] ?? 0n) > 0n;
    return [
      {
        market,
        labels: market.outcomes.map((o, i) => o ?? `Outcome ${i + 1}`),
        values: market.outcomes.map((_, i) => getRedeemedPrice(market, i)),
        toParentCollateral: isChildMarket(market) && parentPaid,
        intoParentShares: false,
      },
    ];
  }

  const rows = flattenChainedRows(
    levelsConfig,
    chained.levels,
    getMarketOverride(market.id)?.finalOtherLabel
  );
  // Deepest level first: its redemption feeds the level above.
  return chained.levels
    .map((levelMarket, level) => ({
      market: levelMarket,
      labels: rows.filter((r) => r.level === level).map((r) => r.label),
      values: levelMarket.wrappedTokens.map((_, i) =>
        getChainedRedeemValue(chained.levels, level, i)
      ),
      // The ConditionalRouter only unwinds one parent, so only level 1 (whose
      // parent is the root) can go straight to collateral.
      toParentCollateral: level === 1,
      intoParentShares: level > 1,
    }))
    .reverse();
}

function buildWinners(market: Market, chained?: ChainedMarketData): Winner[] {
  const levelsConfig = getChainedLevels(market.id);
  if (!chained || !levelsConfig) {
    return market.outcomes
      .map((label, i) => ({
        key: String(i),
        label,
        value: getRedeemedPrice(market, i),
      }))
      .filter((w) => w.value > 0);
  }
  return flattenChainedRows(
    levelsConfig,
    chained.levels,
    getMarketOverride(market.id)?.finalOtherLabel
  )
    .filter((row) => row.kind !== 'other-link')
    .map((row) => ({
      key: `${row.level}-${row.outcomeIndex}`,
      label: row.label,
      value: getChainedRedeemValue(chained.levels, row.level, row.outcomeIndex),
    }))
    .filter((w) => w.value > 0);
}

interface RedeemLevelProps {
  target: RedeemTarget;
  account: Address;
  supports7702: boolean;
  collateralSymbol: string;
  onStatus: (marketId: string, status: LevelStatus) => void;
}

function RedeemLevel({
  target,
  account,
  supports7702,
  collateralSymbol,
  onStatus,
}: RedeemLevelProps) {
  const { market } = target;
  const isLevelClosed = getMarketStatus(market) === MarketStatus.CLOSED;

  const positionsQuery = useMarketPositions(account, market);
  const winningQuery = useWinningPositions(account, market);
  const positions = positionsQuery.data as MarketPosition[] | undefined;
  const winning = winningQuery.data as WinningPositionsResult | undefined;
  const positionsPending = positionsQuery.isPending;
  const winningPending = winningQuery.isPending;

  const items = React.useMemo(() => {
    const winningPositions = winning?.winningPositions ?? [];
    const indexes = winning?.winningOutcomeIndexes ?? [];
    return indexes
      .map((index, i) => ({
        index: Number(index),
        position: winningPositions[i],
      }))
      .filter(
        (it) =>
          it.position &&
          it.position.balance > 0n &&
          (target.values[it.index] ?? 0) > 0
      );
  }, [winning, target.values]);

  // A chained level can resolve after the root: holdings there are not lost yet.
  const hasPendingHoldings =
    !isLevelClosed && (positions ?? []).some((p) => p.balance > 0n);

  const isLoading = positionsPending || (isLevelClosed && winningPending);
  const status: LevelStatus = isLoading
    ? 'loading'
    : items.length > 0 || hasPendingHoldings
      ? 'some'
      : 'none';

  React.useEffect(() => {
    onStatus(market.id, status);
  }, [market.id, status, onStatus]);

  const router = getRedeemRouter(target.toParentCollateral, market);
  const amounts = items.map((it) => it.position.balance);

  const {
    redeemPositions,
    approvals: { data: missingApprovals = [], isLoading: isApprovalLoading },
  } = useRedeemPositions(
    {
      tokensAddresses: items.map((it) => it.position.tokenId),
      account,
      spender: router,
      amounts,
      chainId: market.chainId,
    },
    undefined,
    supports7702,
    toastifyTx,
    toastifySendCallsTx
  );

  const approveTokens = useApproveTokens(toastifyTx);

  if (hasPendingHoldings) {
    return (
      <TradeNotice tone="info" title="Still being finalized">
        Some of your shares belong to a round whose result isn't final yet.
        Come back once it resolves to redeem them.
      </TradeNotice>
    );
  }
  if (status !== 'some') return null;

  const totalValue = items.reduce(
    (acc, it) =>
      acc +
      Number(formatUnits(it.position.balance, WRAPPED_OUTCOME_TOKEN_DECIMALS)) *
        target.values[it.index],
    0
  );

  const needsApproval = !supports7702 && missingApprovals.length > 0;

  const handleApprove = async () => {
    const a = missingApprovals[0];
    if (!a) return;
    await approveTokens.mutateAsync({
      tokenAddress: a.address,
      spender: a.spender,
      amount: a.amount,
      chainId: market.chainId,
    });
  };

  const handleRedeem = async () => {
    await redeemPositions.mutateAsync({
      market,
      collateralToken: undefined,
      parentOutcome: market.parentOutcome,
      outcomeIndexes: items.map((it) => BigInt(it.index)),
      amounts,
      isRedeemToParentCollateral: target.toParentCollateral,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((it) => {
          const shares = Number(
            formatUnits(it.position.balance, WRAPPED_OUTCOME_TOKEN_DECIMALS)
          );
          const label = target.labels[it.index] ?? it.position.symbol;
          return (
            <li
              key={it.position.tokenId}
              className="flex items-baseline justify-between gap-3 rounded-[8px] border border-edge px-3.5 py-3"
            >
              <span className="min-w-0 truncate text-[13px] font-medium text-paper" title={label}>
                {label}
              </span>
              <span className="flex-shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-muted">
                {formatAmount(shares)} shares
              </span>
            </li>
          );
        })}
      </ul>
      <div className="trade-summary">
        <div className="trade-summary-row">
          <span>You get</span>
          <span>
            {target.intoParentShares ? '≈ ' : ''}
            {formatAmount(totalValue)} {collateralSymbol}
          </span>
        </div>
      </div>
      {target.intoParentShares && (
        <TradeNotice tone="info" title="Two steps">
          These shares redeem into the previous round's "Other" shares. Redeem
          those next to receive {collateralSymbol}.
        </TradeNotice>
      )}
      {needsApproval ? (
        <button
          type="button"
          onClick={() => void handleApprove()}
          disabled={approveTokens.isPending || isApprovalLoading}
          className="trade-cta"
        >
          {approveTokens.isPending ? 'Approving…' : 'Approve'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleRedeem()}
          disabled={redeemPositions.isPending || isApprovalLoading}
          className="trade-cta"
        >
          {redeemPositions.isPending ? 'Redeeming…' : 'Redeem'}
        </button>
      )}
    </div>
  );
}

/**
 * Shown in place of the swap once the market has resolved: names the winning
 * outcomes and lets the wallet redeem its winning shares for collateral.
 */
export function RedeemWidget({ market, chained }: RedeemWidgetProps) {
  const { address: account, chainId: connectedChainId } = useAccount();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const isWrongChain =
    account != null &&
    connectedChainId != null &&
    connectedChainId !== market.chainId;

  const collateralSymbol = getActiveCollateralProfile(market.chainId).primary.symbol;

  const targets = React.useMemo(() => buildTargets(market, chained), [market, chained]);
  const winners = React.useMemo(() => buildWinners(market, chained), [market, chained]);

  const [useSmartWallet, setUseSmartWallet] = useSmartWalletPreference();
  const walletSupports7702 = useCheck7702Support(true);
  const supports7702 = walletSupports7702 && useSmartWallet;

  const [levelStatus, setLevelStatus] = React.useState<Record<string, LevelStatus>>({});
  const handleStatus = React.useCallback((marketId: string, status: LevelStatus) => {
    setLevelStatus((prev) =>
      prev[marketId] === status ? prev : { ...prev, [marketId]: status }
    );
  }, []);
  const statuses = targets.map((t) => levelStatus[t.market.id] ?? 'loading');
  const isLoading = statuses.includes('loading');
  const hasSomething = statuses.includes('some');

  return (
    <div className="lot-panel px-5 py-[18px]">
      <div className="mb-5 border-b border-edge pb-4">
        <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-paper">
          Market finalized
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Trading is closed. Winning shares can be redeemed for{' '}
          {collateralSymbol}.
        </p>
      </div>

      {winners.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          <span className={labelClass}>
            {winners.length === 1 ? 'Winner' : 'Paying outcomes'}
          </span>
          <ul className="flex flex-col gap-2">
            {winners.map((w) => (
              <li
                key={w.key}
                className="flex items-baseline justify-between gap-3 text-[13px]"
              >
                <span
                  className="min-w-0 truncate font-semibold text-up"
                  title={w.label}
                >
                  {w.label}
                </span>
                <span className="flex-shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-paper">
                  {formatPerShare(w.value)} {collateralSymbol} / share
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-edge pt-4">
        <span className={labelClass}>Your winnings</span>
        {!account ? (
          <ConnectKitButton.Custom>
            {({ show }: { show?: () => void }) => (
              <button
                type="button"
                onClick={() => show?.()}
                className="trade-cta"
              >
                Connect wallet to redeem
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : isWrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: market.chainId })}
            disabled={isSwitchPending}
            className="trade-cta"
          >
            {isSwitchPending ? 'Switching…' : 'Change network'}
          </button>
        ) : (
          <>
            {targets.map((target) => (
              <RedeemLevel
                key={target.market.id}
                target={target}
                account={account}
                supports7702={supports7702}
                collateralSymbol={collateralSymbol}
                onStatus={handleStatus}
              />
            ))}
            {isLoading ? (
              <p className="text-sm text-muted">Checking your shares…</p>
            ) : !hasSomething ? (
              <TradeNotice tone="info" title="Nothing to redeem">
                This wallet holds no winning shares in this market.
              </TradeNotice>
            ) : null}
            {hasSomething && walletSupports7702 ? (
              <SmartWalletSwitch
                enabled={useSmartWallet}
                onChange={setUseSmartWallet}
                action="the redeem"
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default RedeemWidget;
