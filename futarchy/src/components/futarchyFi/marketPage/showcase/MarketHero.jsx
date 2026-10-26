import { useState } from 'react';
import { StatDisplay, AggregatedStatDisplay, formatVolume, formatLiquidity } from '../page/Formatter';
import MarketBadgeList from '../components/MarketBadgeList';
import NetworkTag from '../../companyList/components/NetworkTag';
import { getExplorerAddressUrl } from '../../../debug/constants/chainConfig';
import { useOrganization } from '../../../../hooks/useOrganization';
import { computeImpactPercent, formatImpactPercent } from '../../../../utils/marketPageUtils.mjs';
import { resolveMarketStatus } from '../../../../utils/proposalLifecycle';
import { TwapCountdown } from './TwapCountdown';
import { SnapshotWidget } from './SnapshotWidget';

const DEFAULT_TWAP_DESCRIPTION = "The Futarchy Test is considered passed if the time-weighted average price (TWAP) of the “pass” (yes) outcome over the final 24 hours of the Issuance KIP’s voting period is greater than or equal to that of the “fail” (no) outcome. If not, the proposal fails the futarchy test, regardless of the Kleros DAO vote result.";

const STATUS_PILL_COLORS = { active: '#25cdfe', awaiting_resolution: '#ff9900', resolved: '#00c42b' };
const STATUS_TAG_TONES = { active: 'cyan', awaiting_resolution: 'warning', resolved: 'green' };
const FALLBACK_LOGO = '/assets/fallback-company.png';

const ExplorerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const TrendIcon = ({ down = false }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {down ? (
      <>
        <path d="M1.5 4.5l4 4 3-3 6 6" />
        <path d="M10.5 11.5h4v-4" />
      </>
    ) : (
      <>
        <path d="M1.5 11.5l4-4 3 3 6-6" />
        <path d="M10.5 4.5h4v4" />
      </>
    )}
  </svg>
);

const StatusDotIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="4" fill="currentColor" />
  </svg>
);

const VolumeIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="1.5" y="8" width="3" height="6.5" rx="1" />
    <rect x="6.5" y="1.5" width="3" height="13" rx="1" />
    <rect x="11.5" y="5" width="3" height="9.5" rx="1" />
  </svg>
);

const DropletIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 1.2c.3 0 .5.1.7.4C10 3.3 13 7.3 13 10a5 5 0 0 1-10 0c0-2.7 3-6.7 4.3-8.4.2-.3.4-.4.7-.4z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path fill="currentColor" fillRule="evenodd" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm-.75 3.5a.75.75 0 0 1 1.5 0v4.1l2.67 1.78a.75.75 0 1 1-.84 1.24l-3-2a.75.75 0 0 1-.33-.62V3.5z" />
  </svg>
);

const RealityButton = ({ href, label, className = '' }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`items-center gap-2 whitespace-nowrap rounded-full border border-[var(--h-border-strong)] bg-[var(--h-surface)] px-4 py-[9px] text-[13px] font-semibold text-[var(--h-ink-2)] transition-colors hover:bg-[var(--h-bg-2)] ${className}`}
  >
    {label}
    <span className="text-[var(--h-blue)]">→</span>
  </a>
);

const MarketHero = ({
  attachHeroRef,
  isScrolled,
  marketData,
  config,
  configLoading,
  currencySymbol,
  isProposalOwner,
  prices,
  pool,
  liquiditySummary,
  timing,
  snapshot,
  badgeModals
}) => {
  const { newYesPrice, newNoPrice, pricesUnavailable } = prices;
  const { poolData, poolDataLoading, poolDataError } = pool;
  const { marketEndTime, resolutionTime } = timing;
  const {
    loading: snapshotLoading,
    data: snapshotData,
    source: snapshotSource,
    highestResult: snapshotHighestResult,
    snapshotProposalId
  } = snapshot;
  const {
    setIsPredictionMarketModalOpen,
    setIsAddLiquidityModalOpen,
    setIsCreatePoolModalOpen,
    setIsEditProposalModalOpen
  } = badgeModals;

  const marketStatus = resolveMarketStatus({
    ...config?.marketInfo,
    endTime: config?.marketInfo?.endTime || marketEndTime
  });
  const isResolved = marketStatus.state === 'resolved';
  const statusBadge = {
    text: marketStatus.labelWithOutcome,
    color: STATUS_PILL_COLORS[marketStatus.state] || STATUS_PILL_COLORS.active
  };

  const { org } = useOrganization(config?._registryMetadata?.organization?.id || null);
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = !logoFailed && org?.logo && org.logo !== FALLBACK_LOGO ? org.logo : null;

  const contractUrl = config?.MARKET_ADDRESS && config?.chainId
    ? getExplorerAddressUrl(config.chainId, config.MARKET_ADDRESS)
    : null;
  const realityLabel = isResolved ? 'View on Reality.eth' : 'Answer on Reality.eth';
  const collapse = isScrolled ? 'lg:hidden' : '';
  const impactPercent = computeImpactPercent(newYesPrice, newNoPrice);
  const impactTone = isResolved || impactPercent == null ? undefined : (impactPercent >= 0 ? 'green' : 'red');

  return (
    <div ref={attachHeroRef} className={`fx-hero relative bg-futarchyGray1/95 backdrop-blur-sm transition-all duration-300 ease-in-out max-lg:-mb-16 dark:bg-futarchyDarkGray2/95 ${isScrolled ? 'lg:h-20 lg:border-b lg:border-[var(--h-border)]' : ''
      }`}>
      <div className={`container mx-auto px-5 transition-all duration-300 ease-in-out ${isScrolled ? 'pt-4 lg:py-2' : 'pt-4 lg:pt-6'
        }`}>
        <div className={`rounded-[12px] border border-[var(--h-border)] bg-[var(--h-surface)] transition-all duration-300 ease-in-out ${isScrolled ? 'px-4 pb-[22px] pt-[18px] sm:px-6 lg:px-5 lg:py-2.5' : 'px-4 pb-[22px] pt-[18px] sm:px-6 lg:px-7 lg:pb-6 lg:pt-5'
          }`}>
          <div className={`mb-4 flex flex-wrap items-center justify-between gap-4 ${collapse}`}>
            <div className="flex flex-wrap items-center gap-2">
              {configLoading ? (
                <span className="h-[26px] w-32 rounded-full bg-[var(--h-bg-2)] animate-pulse" aria-label="Loading status" />
              ) : (
                <span className="fx-status-pill fx-sheen" style={{ '--st': statusBadge.color }}>
                  {statusBadge.text}
                </span>
              )}
              {config?.chainId && <NetworkTag chainId={config.chainId} className="fx-sheen" />}
            </div>
            {contractUrl && (
              <a
                href={contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-[var(--h-ink-3)] transition-colors hover:text-[var(--h-ink)] max-sm:hidden [&_svg]:text-[var(--h-ink-5)]"
              >
                <ExplorerIcon />
                <span>View contract on explorer</span>
              </a>
            )}
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-3 ${isScrolled ? 'lg:items-center' : 'lg:items-start'}`}>
            <div className="min-w-0 lg:col-span-2 lg:pr-6">
              <div className="flex items-start gap-[18px]">
                {logo && (
                  <div className={`h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white ${collapse}`}>
                    <img src={logo} alt="" className="h-full w-full object-cover" onError={() => setLogoFailed(true)} />
                  </div>
                )}
                <h1 className={`min-h-[1.5rem] min-w-0 grow break-words font-display font-medium leading-[1.2] tracking-tight text-[var(--h-ink)] transition-all duration-300 ease-in-out ${isScrolled ? 'text-[22px] lg:text-base' : 'text-[22px] lg:text-[26px]'
                  }`}>
                  {marketData.isLoading && (
                    <span className="block h-6 w-3/4 max-w-xl rounded bg-[var(--h-bg-2)] animate-pulse" aria-label="Loading market title" />
                  )}
                  {!marketData.isLoading && !marketData.error && (
                    <>
                      <span>{marketData.display_title_0}</span>{' '}
                      <span className="text-futarchyViolet7">{marketData.display_title_1}</span>
                    </>
                  )}
                  {!marketData.isLoading && marketData.error && (
                    <span className="text-red-400/80">Market data unavailable</span>
                  )}
                </h1>
                {!marketData.isLoading && marketData.question_link && (
                  <RealityButton
                    href={marketData.question_link}
                    label={realityLabel}
                    className={`hidden shrink-0 sm:inline-flex ${collapse}`}
                  />
                )}
              </div>

              <div className={`mt-4 flex flex-wrap items-center gap-2 ${collapse}`}>
                <StatDisplay
                  variant="tag"
                  tone={impactTone}
                  icon={<TrendIcon down={impactTone === 'red'} />}
                  label="Impact (spot)"
                  // After resolution the losing side's tokens are worthless, so the
                  // gap between the two pools no longer measures anything.
                  value={isResolved ? '—' : formatImpactPercent(impactPercent, pricesUnavailable ? '—' : 'N/A')}
                  valueClassName=""
                  isLoading={!isResolved && !pricesUnavailable && (newYesPrice === null || newNoPrice === null)}
                />

                <AggregatedStatDisplay
                  variant="tag"
                  tone="orange"
                  icon={<VolumeIcon />}
                  label={`Volume (${currencySymbol})`}
                  yesValue={poolData?.yesPool?.volume ?? null}
                  noValue={poolData?.noPool?.volume ?? null}
                  isLoading={poolDataLoading || configLoading}
                  formatFunction={formatVolume}
                  tooltipLabels={{ yes: 'YES Volume', no: 'NO Volume' }}
                  normalize={poolData?.source !== 'subgraph'}
                  unavailable={!!poolDataError}
                />

                <AggregatedStatDisplay
                  variant="tag"
                  tone="teal"
                  icon={<DropletIcon />}
                  label="TVL"
                  yesValue={liquiditySummary.yes?.total ?? null}
                  noValue={liquiditySummary.no?.total ?? null}
                  isLoading={poolDataLoading || configLoading}
                  formatFunction={formatLiquidity}
                  tooltipLabels={{ yes: 'YES TVL', no: 'NO TVL' }}
                  tooltipBreakdown={liquiditySummary.breakdown}
                  tooltipNote="Total value locked in the YES/NO pools across all price ranges. This is not tradable depth: liquidity parked far from the current price doesn't absorb trades, so check the price impact in the trade panel before sizing a trade."
                  normalize={poolData?.source !== 'subgraph'}
                  unavailable={!!poolDataError}
                />

                <StatDisplay
                  variant="tag"
                  tone={STATUS_TAG_TONES[marketStatus.state]}
                  icon={<StatusDotIcon />}
                  label="Status"
                  value={marketStatus.shortLabel}
                  valueClassName=""
                  isLoading={configLoading}
                />

                <StatDisplay
                  variant="tag"
                  tone="violet"
                  icon={<ClockIcon />}
                  label={(() => {
                    if (isResolved) {
                      return "Resolution Date";
                    }
                    if (marketStatus.state === 'awaiting_resolution') {
                      return "Ended";
                    }
                    return marketStatus.showCountdown ? "Remaining Time" : "Trading Ends";
                  })()}
                  value={(() => {
                    // If resolved, show resolution time
                    if (isResolved && config?.marketInfo?.resolvedTime) {
                      return new Date(config.marketInfo.resolvedTime).toLocaleDateString();
                    }
                    if (isResolved && resolutionTime) {
                      return new Date(resolutionTime * 1000).toLocaleDateString();
                    }

                    if (marketStatus.closeTime === null) {
                      return 'Unknown';
                    }
                    const endTimeMs = marketStatus.closeTime * 1000;

                    // Still active, show remaining time
                    if (marketStatus.showCountdown) {
                      const diff = endTimeMs - Date.now();
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return `${days}d ${hours}h ${minutes}m`;
                    }

                    // Ended (or resolved with no resolution time known): the end date.
                    // A resolved market never shows a countdown.
                    return endTimeMs <= Date.now() ? new Date(endTimeMs).toLocaleDateString() : 'Unknown';
                  })()}
                  valueClassName=""
                  isLoading={configLoading}
                />
              </div>

              <div className={`mt-3 flex flex-wrap items-center gap-2 ${collapse}`}>
                {!marketData.isLoading && marketData.question_link && (
                  <RealityButton
                    href={marketData.question_link}
                    label={realityLabel}
                    className="inline-flex sm:hidden"
                  />
                )}
                {contractUrl && (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fx-sheen inline-flex items-center gap-1.5 rounded-[8px] bg-[#e8f0ff] px-[10px] py-[5px] text-[12px] font-medium leading-[1.5] text-[#1e48c2] dark:bg-[#24cdfe]/10 dark:text-[#24cdfe] sm:hidden [&_svg]:h-[11px] [&_svg]:w-[11px]"
                  >
                    <ExplorerIcon />
                    Contract
                  </a>
                )}
                {marketData.isLoading && (
                  <span className="flex gap-2" aria-label="Loading badges">
                    <span className="h-7 w-24 rounded-[8px] bg-[var(--h-bg-2)] animate-pulse" />
                    <span className="h-7 w-32 rounded-[8px] bg-[var(--h-bg-2)] animate-pulse" />
                    <span className="h-7 w-28 rounded-[8px] bg-[var(--h-bg-2)] animate-pulse" />
                  </span>
                )}
                {!marketData.isLoading && !marketData.error && (
                  <MarketBadgeList badges={(() => {
                    const badges = [];

                    // Market Summary badge
                    if (config?.marketInfo?.trackProgressLink) {
                      badges.push({
                        text: 'Market Summary',
                        colorScheme: 'blue',
                        link: config.marketInfo.trackProgressLink
                      });
                    }

                    // Prediction Market badge — opt-in via metadata flag (default off).
                    if (
                      config?.marketInfo?.showPredictionMarket === true &&
                      config?.BASE_TOKENS_CONFIG?.currency?.address && (
                        config?.MERGE_CONFIG?.currencyPositions?.yes?.wrap?.wrappedCollateralTokenAddress ||
                        config?.MERGE_CONFIG?.currencyPositions?.no?.wrap?.wrappedCollateralTokenAddress
                      )
                    ) {
                      badges.push({
                        text: 'Prediction Market',
                        colorScheme: 'gold',
                        onClick: () => setIsPredictionMarketModalOpen(true)
                      });
                    }

                    // Arbitrage Contract badge — links to the market chain's explorer when set in metadata.
                    if (config?.marketInfo?.arbitrageContractAddress) {
                      badges.push({
                        text: 'Arbitrage Contract',
                        colorScheme: 'blue',
                        link: `https://${config?.chainId === 1 ? 'etherscan.io' : 'gnosisscan.io'}/address/${config.marketInfo.arbitrageContractAddress}`
                      });
                    }

                    // Snapshot Vote badge - link to Snapshot proposal
                    {
                      const effectiveSnapshotId = snapshotProposalId || config?._registryMetadata?.snapshot_id;
                      if (effectiveSnapshotId) {
                        const spaceId = snapshotData?.spaceId || 'gnosis.eth';
                        badges.push({
                          text: 'Snapshot Vote',
                          colorScheme: 'purple',
                          link: `https://snapshot.box/#/s:${spaceId}/proposal/${effectiveSnapshotId}`
                        });
                      }
                    }

                    // Add Liquidity badge
                    badges.push({
                      text: 'Add Liquidity',
                      colorScheme: 'emerald',
                      onClick: () => setIsAddLiquidityModalOpen(true)
                    });

                    // Create Pool badge - show when pools are missing (subgraph mode)
                    if (!config?.POOL_CONFIG_YES?.address || !config?.POOL_CONFIG_NO?.address) {
                      badges.push({
                        text: '+ Create Pool',
                        colorScheme: 'violet',
                        onClick: () => setIsCreatePoolModalOpen(true)
                      });
                    }

                    // Edit badge - show only for proposal owners
                    if (isProposalOwner && config?.proposalMetadataAddress) {
                      badges.push({
                        text: '✏️ Edit',
                        colorScheme: 'gray',
                        onClick: () => setIsEditProposalModalOpen(true)
                      });
                    }

                    return badges;
                  })()} />
                )}
                {!marketData.isLoading && marketData.error && (
                  <span className="text-xs text-red-400/80">Badges unavailable</span>
                )}
                <SnapshotWidget
                  snapshotData={snapshotData}
                  snapshotLoading={snapshotLoading}
                  snapshotSource={snapshotSource}
                  snapshotProposalId={snapshotProposalId}
                  snapshotHighestResult={snapshotHighestResult}
                />
              </div>
            </div>

            <div className={`min-w-0 lg:col-span-1 lg:border-l lg:border-[var(--h-border)] lg:pl-6 ${isScrolled ? '' : 'mt-5 border-t border-[var(--h-border)] pt-4 lg:mt-0 lg:border-t-0 lg:pt-0'
              }`}>
              <div className={collapse}>
                {marketData.isLoading && (
                  <div className="space-y-2" aria-label="Loading description">
                    <span className="block h-3 w-full rounded bg-[var(--h-bg-2)] animate-pulse" />
                    <span className="block h-3 w-5/6 rounded bg-[var(--h-bg-2)] animate-pulse" />
                    <span className="block h-3 w-2/3 rounded bg-[var(--h-bg-2)] animate-pulse" />
                  </div>
                )}
                {!marketData.isLoading && !marketData.error && marketData.description && (
                  <p className="break-words text-[12.5px] leading-[1.6] text-[var(--h-ink-3)] [overflow-wrap:anywhere]">{marketData.description}</p>
                )}
                {!marketData.isLoading && marketData.error && (
                  <p className="text-[12.5px] text-red-400/80">Description unavailable</p>
                )}
              </div>

              {!marketData.isLoading && config?.marketInfo?.twapStartTimestamp && (
                <TwapCountdown
                  twapStartTimestamp={config.marketInfo.twapStartTimestamp}
                  twapDurationHours={config.marketInfo.twapDurationHours || 24}
                  twapDescription={config.marketInfo.twapDescription || DEFAULT_TWAP_DESCRIPTION}
                  isScrolled={isScrolled}
                  yesPoolConfig={config.POOL_CONFIG_YES}
                  noPoolConfig={config.POOL_CONFIG_NO}
                  invertTwapPoolYes={config.marketInfo.invertTwapPoolYes || false}
                  invertTwapPoolNo={config.marketInfo.invertTwapPoolNo || config.marketInfo.invertTwapPoolNO || false}
                  yesCompanyTokenAddress={config.metadata?.companyTokens?.yes?.wrappedCollateralTokenAddress || null}
                  noCompanyTokenAddress={config.metadata?.companyTokens?.no?.wrappedCollateralTokenAddress || null}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MarketHero };
