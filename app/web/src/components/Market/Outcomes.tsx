import { Link } from "@/components/Link";
import { useChartData } from "@/hooks/chart/useChartData";
import { useModal } from "@/hooks/useModal";
import { useSortedOutcomes } from "@/hooks/useSortedOutcomes";
import { useWinningOutcomes } from "@/hooks/useWinningOutcomes";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { getFarmingUrl, getPositionUrl } from "@/lib/config";
import { formatDate } from "@/lib/date";
import {
  ArrowUpRightIcon,
  BranchIcon,
  CheckCircleIcon,
  DropletIcon,
  LayersIcon,
  QuestionIcon,
  RightArrow,
} from "@/lib/icons";
import { paths } from "@/lib/paths";
import { displayBalance, isUndefined } from "@/lib/utils";
import {
  NftPosition,
  PoolInfo,
  useMarketOdds,
  useMarketPools,
  useNftPositions,
  usePoolsDeposits,
  useTokenBalances,
  useTokensInfo,
} from "@seer-pm/react";
import { getActivePrimaryCollateral } from "@seer-pm/sdk";
import { getLiquidityUrl, getLiquidityUrlByMarket } from "@seer-pm/sdk";
import type { SupportedChain } from "@seer-pm/sdk";
import {
  Market,
  MarketStatus,
  MarketTypes,
  displayScalarBound,
  getMarketStatus,
  getMarketType,
  getMultiScalarEstimate,
  isInvalidOutcome,
  isOdd,
} from "@seer-pm/sdk";
import clsx from "clsx";
import { differenceInSeconds, startOfDay } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Address, formatUnits } from "viem";
import { useAccount } from "wagmi";
import { Alert } from "../Alert";
import Button from "../Form/Button";
import { Spinner } from "../Spinner";
import { DisplayOdds } from "./DisplayOdds";
import { FarmingActions } from "./FarmingActions";
import { OutcomeActivePanel } from "./OutcomeActivePanel";
import { OutcomeImage } from "./OutcomeImage";

interface OutcomesProps {
  market: Market;
  images?: string[];
  activeOutcome: number;
  onOutcomeChange: (i: number, openDrawer: boolean, swapType?: "buy" | "sell") => void;
}

/**
 * 24-hour trend badge — a fixed "trending" glyph (Nucleo chart-line-up
 * style, wavy line + tip arrow-head) with a tiny mono % label above.
 * The wrapper always occupies a fixed slot so Buy/Sell buttons stay
 * vertically aligned across rows even when a row has nothing to show.
 */
function OutcomeSparkline({ values }: { values?: number[] }) {
  const clean = (values ?? []).filter((v) => Number.isFinite(v));
  const first = clean[0];
  const last = clean[clean.length - 1];
  const hasData = clean.length >= 2 && Number.isFinite(first) && Number.isFinite(last) && first !== 0;
  const pct = hasData ? ((last - first) / Math.abs(first)) * 100 : 0;
  const rel = Math.abs(pct);
  const show = hasData && rel >= 0.5;
  const trend: "up" | "down" | "hidden" = !show ? "hidden" : pct > 0 ? "up" : "down";
  const label = show ? `${pct >= 0 ? "+" : ""}${pct.toFixed(rel >= 10 ? 0 : 1)}%` : "";
  return (
    <div
      className={clsx("outcome-spark", `outcome-spark--${trend}`)}
      title={show ? `${label} · 24h` : undefined}
      aria-hidden={!show}
    >
      {show && (
        <>
          <span className="outcome-spark__pct">{label}</span>
          <svg viewBox="0 0 18 18" className="outcome-spark__glyph" aria-hidden="true">
            <path
              d="M1.75,12.25l3.646-3.646c.195-.195,.512-.195,.707,0l3.293,3.293c.195,.195,.512,.195,.707,0l6.146-6.146"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M12.25,5.75h4v4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </>
      )}
    </div>
  );
}

/**
 * Compact Buy / Sell pair placed left of the price. Both buttons are always
 * hover- and click-able — the swap widget itself handles the "no balance"
 * case for sell, so the shortcut stays consistent regardless of holdings.
 */
function QuickTradeButtons({
  outcomeIndex,
  onQuickTrade,
}: {
  outcomeIndex: number;
  onQuickTrade: (i: number, swapType: "buy" | "sell") => void;
}) {
  return (
    <div className="quick-trade">
      <button
        type="button"
        className="quick-trade__btn quick-trade__btn--buy"
        onClick={(e) => {
          e.stopPropagation();
          onQuickTrade(outcomeIndex, "buy");
        }}
        aria-label="Quick buy this outcome"
      >
        Buy
      </button>
      <button
        type="button"
        className="quick-trade__btn quick-trade__btn--sell"
        onClick={(e) => {
          e.stopPropagation();
          onQuickTrade(outcomeIndex, "sell");
        }}
        aria-label="Quick sell this outcome"
      >
        Sell
      </button>
    </div>
  );
}

function poolRewardsInfo(pool: PoolInfo) {
  const { poolIncentive, realEndTime, isRewardEnded } =
    pool.incentives.length > 0
      ? {
          poolIncentive:
            pool.incentives[0].apr === 0
              ? `${displayBalance(pool.incentives[0].rewardRate * 86400n, 18, true)} SEER / day`
              : `${pool.incentives[0].apr.toFixed(2)}% APR`,
          realEndTime: formatDate(Number(pool.incentives[0].realEndTime)),
          isRewardEnded: Number(pool.incentives[0].realEndTime) * 1000 < new Date().getTime(),
        }
      : { poolIncentive: "0 SEER / day", realEndTime: "", isRewardEnded: true };
  return (
    <div>
      {!isRewardEnded && (
        <div>
          <span className="font-semibold">{pool.dex}</span> ~ {poolIncentive}
        </div>
      )}
      {pool.incentives.length > 0 ? (
        <div className="flex items-center gap-2">
          <p>
            {isRewardEnded ? "Rewards ended on" : "Rewards end"}:{" "}
            <span className={isRewardEnded ? "text-[#6E6E6E]" : "text-purple-primary"}>{realEndTime}</span>
          </p>
        </div>
      ) : (
        "This pool currently has no active incentives or rewards"
      )}
    </div>
  );
}

function AddLiquidityInfo({
  chainId,
  pools,
  closeModal,
}: {
  chainId: SupportedChain;
  pools: PoolInfo[];
  closeModal: () => void;
}) {
  const { address } = useAccount();
  const { data: deposits } = usePoolsDeposits(
    chainId,
    pools.map((p) => p.id),
    address,
  );

  const { data: nftPositionMapping } = useNftPositions(
    chainId,
    Object.values(deposits ?? {})
      .flat()
      .map((x) => x.id),
  );

  return (
    <div>
      <Alert type="info" title="Farming Rewards">
        Earn farming rewards (SEER) by providing liquidity to existing markets.
      </Alert>

      <div className="mt-[32px] mb-[24px] font-semibold">Available Pools:</div>

      <div className="space-y-[12px]">
        {pools.map((pool) => {
          const hasIncentives = pool.incentives.length > 0;
          const isRewardEnded = hasIncentives
            ? Number(pool.incentives[0].realEndTime) * 1000 < new Date().getTime()
            : true;
          return (
            <div className="border border-separator-100 p-[24px] text-[14px]" key={pool.id}>
              <div className="flex justify-between items-center">
                <div>{poolRewardsInfo(pool)}</div>
                <div>
                  <a
                    href={getLiquidityUrl(chainId, pool.token0, pool.token1)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-primary flex items-center space-x-2"
                  >
                    <span>Add liquidity</span> <RightArrow />
                  </a>
                </div>
              </div>

              {deposits?.[pool.id] && (
                <div className="space-y-[16px] mt-[16px]">
                  {deposits[pool.id].map((deposit) => {
                    const isFarming =
                      deposit.onFarmingCenter && (deposit.limitFarming !== null || deposit.eternalFarming !== null);
                    return (
                      <div key={deposit.id}>
                        <div className="flex items-center justify-between items-center">
                          <div>
                            <a
                              href={getPositionUrl(chainId, deposit.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-primary hover:underline block"
                            >
                              Position #{deposit.id}
                            </a>
                            {deposit.onFarmingCenter && (
                              <>
                                {" "}
                                <a
                                  href={getFarmingUrl(chainId, deposit.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-primary hover:underline text-[13px]"
                                >
                                  {deposit.limitFarming === null && deposit.eternalFarming === null
                                    ? "(On Farming Center)"
                                    : "(In Farming)"}
                                </a>
                              </>
                            )}
                          </div>
                          <div>
                            {address && (
                              <FarmingActions
                                account={address}
                                chainId={chainId}
                                deposit={deposit}
                                pool={pool}
                                isRewardEnded={isRewardEnded}
                              />
                            )}
                          </div>
                        </div>
                        {nftPositionMapping?.[deposit.id] && !isRewardEnded && isFarming && (
                          <RewardsDisplay
                            position={nftPositionMapping[deposit.id]}
                            totalRewardPerDay={Number(formatUnits(pool.incentives[0].rewardRate * 86400n, 18))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center my-[32px]">
        <a
          href={paths.farmingProgram()}
          className="text-purple-primary text-[12px]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more about the farming program
        </a>
      </div>

      <div className="text-center">
        <Button text="Return" variant="secondary" type="button" onClick={closeModal} />
      </div>
    </div>
  );
}

function AddLiquidityLinks({
  market,
  outcomeIndex,
  pools,
  openLiquidityModal,
  iconOnly = false,
}: {
  market: Market;
  outcomeIndex: number;
  pools: PoolInfo[][];
  openLiquidityModal?: () => void;
  iconOnly?: boolean;
}) {
  if (iconOnly) {
    const commonProps = {
      "aria-label": "Add Liquidity",
      className: "outcome-action-icon",
    };
    return (
      <span className="tooltip">
        <span className="tooltiptext">Add Liquidity</span>
        {openLiquidityModal && !isUndefined(pools[outcomeIndex]) ? (
          <button
            type="button"
            onClick={() => {
              openLiquidityModal();
            }}
            {...commonProps}
          >
            <DropletIcon />
          </button>
        ) : (
          <a
            href={getLiquidityUrlByMarket(market, outcomeIndex)}
            target="_blank"
            rel="noopener noreferrer"
            {...commonProps}
          >
            <DropletIcon />
          </a>
        )}
      </span>
    );
  }
  return (
    <>
      {openLiquidityModal && !isUndefined(pools[outcomeIndex]) ? (
        <button
          type="button"
          onClick={() => {
            openLiquidityModal();
          }}
          className="text-blue hover:text-blue-hover transition-colors text-left font-medium"
        >
          Add Liquidity
        </button>
      ) : (
        <a
          href={getLiquidityUrlByMarket(market, outcomeIndex)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue flex items-center space-x-2 hover:text-blue-hover transition-colors text-left font-medium"
        >
          Add Liquidity
        </a>
      )}
    </>
  );
}

function RewardsDisplay({
  position,
  totalRewardPerDay,
}: {
  position: NftPosition;
  totalRewardPerDay: number;
}) {
  const {
    pool: { tick },
    tickLower: { tickIdx: tickLowerIdx },
    tickUpper: { tickIdx: tickUpperIdx },
  } = position;
  const [currentReward, setCurrentReward] = useState(0);
  const rewardPerDay = (Number(position.liquidity) / Number(position.pool.liquidity)) * totalRewardPerDay;
  const rewardPerSecond = rewardPerDay / (24 * 60 * 60);
  useEffect(() => {
    const now = new Date();
    const currentReward = differenceInSeconds(now, startOfDay(now)) * rewardPerSecond;
    setCurrentReward(currentReward);
    const interval = setInterval(() => {
      setCurrentReward((curr) => curr + rewardPerSecond);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);
  if (Number(tick) <= Number(tickLowerIdx) || Number(tick) >= Number(tickUpperIdx)) {
    return <p className="text-[12px] text-warning-primary">Position out of range.</p>;
  }
  return (
    <p className="text-[12px]">
      Today's reward: <span className="text-purple-primary font-semibold">{currentReward.toFixed(0)}</span> /{" "}
      <span className="text-purple-primary font-semibold">{rewardPerDay.toFixed(0)}</span> SEER
    </p>
  );
}

interface OutcomeDetailProps {
  market: Market;
  marketStatus?: MarketStatus;
  wrappedAddress: Address;
  openModal?: () => void;
  outcomeIndex: number;
  pools: PoolInfo[][];
  loopIndex: number;
  images?: string[];
  isPoolDetailsOpen?: boolean;
  onTogglePoolDetails?: () => void;
}

function OutcomeDetails({
  market,
  marketStatus,
  wrappedAddress,
  openModal,
  outcomeIndex,
  pools,
  loopIndex,
  images,
  isPoolDetailsOpen,
  onTogglePoolDetails,
}: OutcomeDetailProps) {
  const { address } = useAccount();
  const { data: balances } = useTokenBalances(address, market.wrappedTokens, market.chainId);
  const { data: winningOutcomes } = useWinningOutcomes(market, marketStatus);
  const { data: tokensInfo = [] } = useTokensInfo(market.wrappedTokens, market.chainId);

  const blockExplorerUrl = SUPPORTED_CHAINS?.[market.chainId]?.blockExplorers?.default?.url;

  const getTooltipContent = (market: Market, outcomeIndex: number) => {
    const primarySymbol = getActivePrimaryCollateral(market.chainId).symbol;
    const [lowerBound, upperBound] = [displayScalarBound(market.lowerBound), displayScalarBound(market.upperBound)];
    if (outcomeIndex === 1) {
      return `Redeem for (${primarySymbol} per token):\nAnswer ≥ ${upperBound}: 1\nAnswer within [${lowerBound}-${upperBound}]: (answer-${lowerBound})/(${upperBound}-${lowerBound})\nAnswer ≤ ${lowerBound}: 0`;
    }
    if (outcomeIndex === 0) {
      return `Redeem for (${primarySymbol} per token):\nAnswer ≥ ${upperBound}: 0\nAnswer within [${lowerBound}-${upperBound}]: (${upperBound}-answer)/(${upperBound}-${lowerBound})\nAnswer ≤ ${lowerBound}: 1`;
    }
    return "";
  };

  const _isInvalidOutcome = isInvalidOutcome(market, outcomeIndex);

  return (
    <div className="flex items-center space-x-[12px]">
      <div className="flex-shrink-0 max-lg:hidden">
        <OutcomeImage
          image={images?.[outcomeIndex]}
          isInvalidOutcome={_isInvalidOutcome}
          title={market.outcomes[outcomeIndex]}
          className="w-[38px] h-[38px] rounded-full dark:bg-neutral"
        />
      </div>
      <div className="space-y-1">
        <div className="text-[15px] font-semibold tracking-[-0.005em] mb-1 flex items-center gap-1 flex-wrap">
          <p>
            {market.type === "Generic" && <span className="text-ink">#{loopIndex + 1}</span>}{" "}
            {market.outcomes[outcomeIndex]}{" "}
            {outcomeIndex <= 1 &&
              getMarketType(market) === MarketTypes.SCALAR &&
              `[${displayScalarBound(market.lowerBound)},${displayScalarBound(market.upperBound)}]`}{" "}
          </p>
          {getMarketType(market) === MarketTypes.SCALAR && outcomeIndex !== market.wrappedTokens.length - 1 && (
            <span className="tooltip">
              <p className="tooltiptext !whitespace-pre-wrap w-[250px] md:w-[400px] !text-left">
                {getTooltipContent(market, outcomeIndex)}
              </p>
              <QuestionIcon fill="var(--blue)" width={12} height={12} />
            </span>
          )}
          {_isInvalidOutcome && (
            <span className="tooltip">
              <p className="tooltiptext !whitespace-pre-wrap w-[300px]">
                Invalid outcome tokens can be redeemed for the underlying tokens when the question is resolved to
                invalid.
              </p>
              <QuestionIcon fill="var(--blue)" width={12} height={12} />
            </span>
          )}

          {winningOutcomes?.[outcomeIndex] === true && <CheckCircleIcon className="text-success-primary" />}
          {balances && balances[outcomeIndex] > 0n && (
            <span className="quick-btn quick-btn--pct !cursor-default">
              {displayBalance(balances[outcomeIndex], 18, true)} {tokensInfo?.[outcomeIndex]?.symbol}
            </span>
          )}
        </div>
        <div className="outcome-actions text-[12px] flex items-center gap-x-2 gap-y-1.5 flex-wrap flex-row justify-start">
          <span className="tooltip">
            <span className="tooltiptext">View on {SUPPORTED_CHAINS?.[market.chainId]?.name}</span>
            <a
              href={blockExplorerUrl && `${blockExplorerUrl}/token/${wrappedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View on ${SUPPORTED_CHAINS?.[market.chainId]?.name}`}
              className="outcome-action-icon"
            >
              <ArrowUpRightIcon />
            </a>
          </span>

          {market.type === "Generic" && (
            <AddLiquidityLinks
              market={market}
              outcomeIndex={outcomeIndex}
              pools={pools}
              openLiquidityModal={openModal}
              iconOnly
            />
          )}

          {market.type === "Generic" && onTogglePoolDetails && (
            <span className="tooltip">
              <span className="tooltiptext">{isPoolDetailsOpen ? "Hide pool details" : "View pool details"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePoolDetails();
                }}
                aria-label={isPoolDetailsOpen ? "Hide pool details" : "View pool details"}
                aria-pressed={isPoolDetailsOpen}
                className={clsx("outcome-action-icon", isPoolDetailsOpen && "is-active")}
              >
                <LayersIcon />
              </button>
            </span>
          )}

          {market.type === "Generic" && (
            <span className="tooltip">
              <span className="tooltiptext">New conditional market</span>
              <Link
                to={`/create-market?parentMarket=${market.id}&parentOutcome=${encodeURIComponent(
                  market.outcomes[outcomeIndex],
                )}`}
                aria-label="New conditional market"
                className="outcome-action-icon"
              >
                <BranchIcon />
              </Link>
            </span>
          )}
        </div>
        <div className="text-[12px] flex items-center gap-4 flex-wrap"></div>
      </div>
    </div>
  );
}

function MultiScalarEstimate({
  market,
  odds,
}: {
  market: Market;
  odds: number | null | undefined;
}) {
  if (getMarketType(market) !== MarketTypes.MULTI_SCALAR || !isOdd(odds)) {
    return null;
  }

  const estimate = getMultiScalarEstimate(market, odds!);

  if (estimate === null) {
    return null;
  }

  return (
    <div className="text-[13px] font-normal">
      ~ {estimate.value} {estimate.unit}
    </div>
  );
}

const OUTCOME_CARD_SCROLL_OFFSET = 24;
const OUTCOME_ACTIVE_PANEL_ANIMATION_MS = 300;

const isOutcomeCardFullyVisible = (element: HTMLElement) => {
  const { top, bottom } = element.getBoundingClientRect();
  return top >= OUTCOME_CARD_SCROLL_OFFSET && bottom <= window.innerHeight;
};

export function Outcomes({ market, images, activeOutcome, onOutcomeChange }: OutcomesProps) {
  const { data: odds = [], isLoading } = useMarketOdds(market, true);
  const { data: pools = [] } = useMarketPools(market);
  const { data: chartData } = useChartData(market, 1, 3600, undefined);
  const { Modal, openModal, closeModal } = useModal("liquidity-modal");
  const marketStatus = getMarketStatus(market);
  const { data: indexesOrderedByOdds } = useSortedOutcomes(odds, market, marketStatus);
  const canQuickTrade = market.type === "Generic" && marketStatus !== MarketStatus.CLOSED;

  const hasInitializedRef = useRef(false);
  const outcomeCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [poolDetailsOutcomeIndex, setPoolDetailsOutcomeIndex] = useState<number | null>(null);

  const scrollOutcomeCardIntoView = (outcomeIndex: number, waitForPanelAnimation = false) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const delay = waitForPanelAnimation ? OUTCOME_ACTIVE_PANEL_ANIMATION_MS : 0;

    requestAnimationFrame(() => {
      scrollTimeoutRef.current = setTimeout(() => {
        const element = outcomeCardRefs.current[outcomeIndex];
        if (!element) return;
        if (isOutcomeCardFullyVisible(element)) return;

        const top = element.getBoundingClientRect().top + window.scrollY - OUTCOME_CARD_SCROLL_OFFSET;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }, delay);
    });
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (indexesOrderedByOdds && !hasInitializedRef.current) {
      const i = indexesOrderedByOdds[0];
      onOutcomeChange(i, false);
      hasInitializedRef.current = true;
    }
  }, [indexesOrderedByOdds, onOutcomeChange]);

  return (
    <div className="card-box p-[22px]">
      <div className="font-display text-[18px] font-semibold tracking-tight mb-[18px]">Outcomes</div>
      <div className="space-y-2.5">
        {(market.type === "Generic" ? market.wrappedTokens : ["_", "_"]).map((_, j) => {
          const i = indexesOrderedByOdds ? indexesOrderedByOdds[j] : j;
          const openModalCallback =
            !isUndefined(pools[i]) && pools[i].length > 0 && market.type !== "Futarchy" ? openModal : undefined;
          const isActive = activeOutcome === i || (market.type === "Futarchy" && activeOutcome === i + 2);
          return (
            <div
              key={market.wrappedTokens[i]}
              ref={(el) => {
                outcomeCardRefs.current[i] = el;
              }}
            >
              <div
                onClick={(e) => {
                  const isClickOnLinkOrButton = (e.target as HTMLElement).closest?.("a, button");
                  onOutcomeChange(i, !isClickOnLinkOrButton);
                  if (!isClickOnLinkOrButton) {
                    setPoolDetailsOutcomeIndex(null);
                    scrollOutcomeCardIntoView(i);
                  }
                }}
                className={clsx(
                  "card flex-row justify-between items-center p-[14px] cursor-pointer transition-colors hover:bg-bg-2",
                  isActive ? "card-active hover:!bg-transparent" : "",
                  market.type === "Futarchy" && "max-md:space-y-[12px]",
                )}
              >
                {market.type === "Generic" ? (
                  <OutcomeDetails
                    market={market}
                    wrappedAddress={market.wrappedTokens[i]}
                    marketStatus={marketStatus}
                    openModal={openModalCallback}
                    outcomeIndex={i}
                    pools={pools}
                    loopIndex={j}
                    images={images}
                    isPoolDetailsOpen={poolDetailsOutcomeIndex === i}
                    onTogglePoolDetails={() => {
                      const willOpen = poolDetailsOutcomeIndex !== i;
                      setPoolDetailsOutcomeIndex((prev) => (prev === i ? null : i));
                      if (willOpen) {
                        scrollOutcomeCardIntoView(i, true);
                      }
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-2 min-w-[50%]">
                    <OutcomeDetails
                      market={market}
                      wrappedAddress={market.wrappedTokens[i]}
                      marketStatus={marketStatus}
                      openModal={openModalCallback}
                      outcomeIndex={i}
                      pools={pools}
                      loopIndex={j}
                      images={images}
                    />
                    <OutcomeDetails
                      market={market}
                      wrappedAddress={market.wrappedTokens[i + 2]}
                      marketStatus={marketStatus}
                      openModal={openModalCallback}
                      outcomeIndex={i + 2}
                      pools={pools}
                      loopIndex={j}
                      images={images}
                    />
                  </div>
                )}
                {market.type === "Futarchy" && (
                  <div className="flex justify-center gap-x-4 w-full text-[12px] pt-[12px] pr-[64px]">
                    <AddLiquidityLinks
                      market={market}
                      outcomeIndex={i}
                      pools={pools}
                      openLiquidityModal={openModal}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1.5 min-[400px]:gap-2">
                  {canQuickTrade && (
                    <QuickTradeButtons
                      outcomeIndex={i}
                      onQuickTrade={(idx, swapType) => onOutcomeChange(idx, true, swapType)}
                    />
                  )}
                  {canQuickTrade && (
                    <OutcomeSparkline
                      values={chartData?.chartData
                        .find((c) => c.name === market.outcomes[i])
                        ?.data.map(([, v]) => Number(v))}
                    />
                  )}
                  {market.type === "Generic" && (
                    <div
                      className="font-display text-[20px] min-[400px]:text-[22px] font-medium tracking-tight tabular-nums text-right min-w-[48px]"
                      style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
                    >
                      {isLoading ? (
                        <Spinner />
                      ) : (
                        <>
                          <DisplayOdds odd={odds[i]} marketType={getMarketType(market)} />
                          {!isInvalidOutcome(market, i) && <MultiScalarEstimate market={market} odds={odds[i]} />}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {poolDetailsOutcomeIndex === i && <OutcomeActivePanel market={market} outcomeIndex={i} />}
            </div>
          );
        })}
        <Modal
          title="Add Liquidity"
          content={
            <AddLiquidityInfo chainId={market.chainId} pools={pools[activeOutcome] || []} closeModal={closeModal} />
          }
        />
      </div>
    </div>
  );
}
