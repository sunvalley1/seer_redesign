import type { Market } from '@seer-pm/sdk';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { IOutcomeData } from './MarketChart';

interface LegendProps {
  outcomesData: IOutcomeData[];
  visibleOutcomes: Set<string>;
  onToggleOutcome: (outcomeName: string) => void;
  market: Market;
}

export default function Legend({
  outcomesData,
  visibleOutcomes,
  onToggleOutcome,
  market,
}: LegendProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [outcomesData]);

  if (outcomesData.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center pr-16">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {outcomesData.map(({ outcome, data }, index) => {
          const isVisible = visibleOutcomes.has(outcome.name);
          const lastValue = data.slice(-1)?.[0]?.value;
          const decimalPlaces = market.type === 'Futarchy' ? 3 : 1;
          const formattedValue = lastValue
            ? lastValue % 1 === 0
              ? `${lastValue}%`
              : `${lastValue.toFixed(decimalPlaces)}%`
            : '0%';

          return (
            <button
              key={`item-${index}`}
              type="button"
              onClick={() => onToggleOutcome(outcome.name)}
              className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-2.5 py-1 text-xs transition-colors hover:bg-wall focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-up"
            >
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: isVisible ? outcome.color : 'rgb(var(--sb-ink-5))',
                  opacity: isVisible ? 1 : 0.6,
                }}
              />
              <span className="max-w-[200px] truncate text-paper">
                {outcome.name}
              </span>
              <span className="font-semibold text-muted">
                {formattedValue}
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute right-0 flex gap-1">
        <button
          type="button"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={clsx(
            'flex h-6 w-6 items-center justify-center transition-opacity',
            !canScrollLeft && 'cursor-not-allowed opacity-30'
          )}
          aria-label="Scroll legend left"
        >
          <div className="h-0 w-0 border-b-[5px] border-r-[7px] border-t-[5px] border-b-transparent border-r-muted border-t-transparent" />
        </button>
        <button
          type="button"
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={clsx(
            'flex h-6 w-6 items-center justify-center transition-opacity',
            !canScrollRight && 'cursor-not-allowed opacity-30'
          )}
          aria-label="Scroll legend right"
        >
          <div className="h-0 w-0 border-b-[5px] border-l-[7px] border-t-[5px] border-b-transparent border-l-muted border-t-transparent" />
        </button>
      </div>
    </div>
  );
}
