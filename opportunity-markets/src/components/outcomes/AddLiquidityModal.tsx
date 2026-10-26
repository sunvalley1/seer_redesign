import * as React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { formatUnits } from 'viem';
import { gnosis } from 'viem/chains';
import { useAccount } from 'wagmi';
import {
  useNftPositions,
  usePoolsDeposits,
  type NftPosition,
  type PoolDeposit,
  type PoolInfo,
} from '@seer-pm/react';
import {
  getLiquidityUrl,
  getLiquidityUrlByMarket,
  type Market,
} from '@seer-pm/sdk';
import { useOutcomePools } from '../../hooks/useOutcomePools';
import { displayBalance } from '../../utils/format';
import { ArrowUpRightIcon, CloseIcon, InfoCircleIcon } from './icons';

const FARMING_PROGRAM_URL =
  'https://seer-pm.medium.com/announcing-the-seer-initial-airdrop-distribution-58d38e1ec8f9';
const SWAPR_APP_URL = 'https://v3.swapr.eth.limo/#';

const linkClass =
  'text-brand transition-colors hover:text-up hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up';

function getPositionUrl(chainId: number, id: string) {
  return chainId === gnosis.id ? `${SWAPR_APP_URL}/pool/${id}` : undefined;
}

function getFarmingUrl(chainId: number, id: string) {
  return chainId === gnosis.id ? `${SWAPR_APP_URL}/farming/farms#${id}` : undefined;
}

function isRewardEnded(pool: PoolInfo) {
  const incentive = pool.incentives[0];
  return !incentive || Number(incentive.realEndTime) * 1000 < Date.now();
}

function PoolRewardsInfo({ pool }: { readonly pool: PoolInfo }) {
  const incentive = pool.incentives[0];
  if (!incentive) {
    return <p>This pool currently has no active incentives or rewards</p>;
  }
  const ended = isRewardEnded(pool);
  const reward =
    incentive.apr === 0
      ? `${displayBalance(incentive.rewardRate * 86400n)} SEER / day`
      : `${incentive.apr.toFixed(2)}% APR`;
  return (
    <div className="space-y-1">
      {!ended && (
        <p>
          <span className="font-semibold">{pool.dex}</span> ~ {reward}
        </p>
      )}
      <p>
        {ended ? 'Rewards ended on' : 'Rewards end'}:{' '}
        <span className={ended ? 'text-muted' : 'text-brand'}>
          {format(new Date(Number(incentive.realEndTime) * 1000), 'MMMM d yyyy, HH:mm')}
        </span>
      </p>
    </div>
  );
}

function RewardsDisplay({
  position,
  totalRewardPerDay,
}: {
  readonly position: NftPosition;
  readonly totalRewardPerDay: number;
}) {
  const rewardPerDay =
    (Number(position.liquidity) / Number(position.pool.liquidity)) * totalRewardPerDay;
  const rewardPerSecond = rewardPerDay / 86400;
  const [currentReward, setCurrentReward] = React.useState(0);

  React.useEffect(() => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    setCurrentReward(((now.getTime() - dayStart.getTime()) / 1000) * rewardPerSecond);
    const interval = setInterval(() => setCurrentReward((curr) => curr + rewardPerSecond), 1000);
    return () => clearInterval(interval);
  }, [rewardPerSecond]);

  const tick = Number(position.pool.tick);
  if (tick <= Number(position.tickLower.tickIdx) || tick >= Number(position.tickUpper.tickIdx)) {
    return <p className="text-[12px] text-[#b45309] dark:text-[#fbbf24]">Position out of range.</p>;
  }
  return (
    <p className="text-[12px]">
      Today&apos;s reward: <span className="font-semibold text-brand">{currentReward.toFixed(0)}</span> /{' '}
      <span className="font-semibold text-brand">{rewardPerDay.toFixed(0)}</span> SEER
    </p>
  );
}

export interface AddLiquidityModalProps {
  readonly market: Market;
  readonly outcomeIndex: number | null;
  readonly outcomeLabel?: string;
  readonly onClose: () => void;
}

export function AddLiquidityModal({
  market,
  outcomeIndex,
  outcomeLabel,
  onClose,
}: AddLiquidityModalProps) {
  const open = outcomeIndex != null;
  const { address } = useAccount();
  const { data: poolsData, isLoading } = useOutcomePools(market, outcomeIndex, open);
  const pools: PoolInfo[] = poolsData ?? [];
  const { data: depositsData } = usePoolsDeposits(
    market.chainId,
    pools.map((pool) => pool.id),
    address
  );
  const deposits = depositsData as Record<string, PoolDeposit[]> | undefined;
  const { data: nftPositionsData } = useNftPositions(
    market.chainId,
    Object.values(deposits ?? {})
      .flat()
      .map((deposit) => deposit.id)
  );
  const nftPositions = nftPositionsData as Record<string, NftPosition> | undefined;

  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (outcomeIndex == null) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-liquidity-title"
        tabIndex={-1}
        className="lot-panel relative max-h-[min(90vh,820px)] w-full max-w-[620px] overflow-y-auto p-6 text-[14px] text-paper shadow-panel outline-none sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-bg-2 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
        >
          <CloseIcon />
        </button>

        <h3
          id="add-liquidity-title"
          className="text-center font-display text-[24px] font-semibold tracking-[-0.02em] text-paper"
        >
          Add Liquidity
        </h3>
        {outcomeLabel ? (
          <p className="mt-1 text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
            {outcomeLabel}
          </p>
        ) : null}

        <div className="mt-8 flex gap-3 rounded-control border border-edge p-4">
          <span className="shrink-0 text-brand">
            <InfoCircleIcon />
          </span>
          <div>
            <p className="text-[16px] font-semibold text-brand">Farming Rewards</p>
            <p className="mt-0.5 text-ink-2">
              Earn farming rewards (SEER) by providing liquidity to existing markets.
            </p>
          </div>
        </div>

        <p className="mb-6 mt-8 font-semibold">Available Pools:</p>

        <div className="space-y-3">
          {isLoading ? (
            <div className="h-[76px] animate-pulse rounded-control bg-bg-2" />
          ) : pools.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-edge p-6">
              <p className="text-ink-3">This outcome has no pool yet.</p>
              <a
                href={getLiquidityUrlByMarket(market, outcomeIndex)}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 font-medium ${linkClass}`}
              >
                Add liquidity <ArrowUpRightIcon size={13} />
              </a>
            </div>
          ) : (
            pools.map((pool) => {
              const ended = isRewardEnded(pool);
              const poolDeposits = deposits?.[pool.id];
              return (
                <div key={pool.id} className="border border-edge p-6">
                  <div className="flex items-center justify-between gap-4">
                    <PoolRewardsInfo pool={pool} />
                    <a
                      href={getLiquidityUrl(market.chainId, pool.token0, pool.token1)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex shrink-0 items-center gap-1.5 font-medium ${linkClass}`}
                    >
                      Add liquidity <ArrowUpRightIcon size={13} />
                    </a>
                  </div>

                  {poolDeposits && poolDeposits.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {poolDeposits.map((deposit) => {
                        const isFarming =
                          deposit.onFarmingCenter &&
                          (deposit.limitFarming !== null || deposit.eternalFarming !== null);
                        const positionUrl = getPositionUrl(market.chainId, deposit.id);
                        const farmingUrl = getFarmingUrl(market.chainId, deposit.id);
                        const position = nftPositions?.[deposit.id];
                        return (
                          <div key={deposit.id}>
                            <a
                              href={positionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block ${linkClass}`}
                            >
                              Position #{deposit.id}
                            </a>
                            {deposit.onFarmingCenter && (
                              <a
                                href={farmingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-[13px] ${linkClass}`}
                              >
                                {deposit.limitFarming === null && deposit.eternalFarming === null
                                  ? '(On Farming Center)'
                                  : '(In Farming)'}
                              </a>
                            )}
                            {position && !ended && isFarming && pool.incentives[0] && (
                              <RewardsDisplay
                                position={position}
                                totalRewardPerDay={Number(
                                  formatUnits(pool.incentives[0].rewardRate * 86400n, 18)
                                )}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="my-8 text-center">
          <a
            href={FARMING_PROGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[12px] ${linkClass}`}
          >
            Learn more about the farming program
          </a>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onClose}
            className="sb-ghost px-8 py-2.5 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
          >
            Return
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AddLiquidityModal;
