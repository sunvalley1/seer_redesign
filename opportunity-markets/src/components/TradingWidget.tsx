import * as React from 'react';
import { MarketStatus, getMarketStatus, type Market } from '@seer-pm/sdk';
import type { ChainedMarketData } from '../lib/chainedMarket';
import { RedeemWidget } from './RedeemWidget';
import { SwapWidget, type TradeModeRequest } from './SwapWidget';

export interface TradingWidgetProps {
  readonly className?: string;
  readonly market: Market;
  readonly chained?: ChainedMarketData;
  readonly outcomeIndex: number;
  readonly onOutcomeIndexChange: (index: number) => void;
  readonly requestedMode?: TradeModeRequest;
}

export const TradingWidget: React.FC<TradingWidgetProps> = ({
  className = '',
  market,
  chained,
  outcomeIndex,
  onOutcomeIndexChange,
  requestedMode,
}) => {
  return (
    <aside
      id="trade"
      className={className}
      data-purpose="trading-interface"
    >
      {getMarketStatus(market) === MarketStatus.CLOSED ? (
        <RedeemWidget market={market} chained={chained} />
      ) : (
        <SwapWidget
          market={market}
          chained={chained}
          outcomeIndex={outcomeIndex}
          onOutcomeIndexChange={onOutcomeIndexChange}
          requestedMode={requestedMode}
        />
      )}
    </aside>
  );
};

export default TradingWidget;
